// app/api/projects/[id]/gaps/[gapId]/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { screenText } from "@/lib/screen";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const answerSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(10, "Answer must be at least 10 characters")
    .max(2000, "Answer must be 2000 characters or fewer"),
});

/**
 * Summarizes the answer into a one-line claim statement using Gemini with a rules fallback.
 */
async function generateStatement(answerText: string, claimType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  // Rules fallback: first sentence or first 120 chars
  const fallback =
    answerText.split(/[.!?]\s+/)[0]?.trim().slice(0, 140) ||
    answerText.slice(0, 140);

  if (!apiKey) {
    return fallback;
  }

  try {
    const prompt = `Summarize this handover explanation into a single concise claim statement (1 sentence, max 120 characters) for claim type '${claimType}':
"${answerText}"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) return fallback;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text ? text.replace(/^["']|["']$/g, "").slice(0, 160) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * POST /api/projects/[id]/gaps/[gapId]/answer
 * Leaver of that project only.
 * Single DB transaction:
 * 1. Screen answer (secrets, emails, phones)
 * 2. Insert source { title: 'Leaver answer: gap #<id>', kind: 'leaver_answer', access_tag }
 * 3. Insert chunk with masked text
 * 4. Insert claim: type = decision for decision_no_reason, owner for action_no_owner, dependency for leaver_only
 * 5. Run integrity check (excerpt exact substring of chunk). Store claim_versions.
 * 6. Update gap: status='resolved', answer, answered_claim_id, answered_at
 * 7. Write audit_log entries
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; gapId: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, gapId } = await context.params;
    if (!projectId || !/^\d+$/.test(projectId) || !gapId || !/^\d+$/.test(gapId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Role check: leaver of that project only (or admin)
    const { rows: memberRows } = await pool.query(
      `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE u.id = $2::bigint`,
      [projectId, session.user.id]
    );

    const effectiveRole = memberRows[0]?.role || "incoming";
    if (effectiveRole !== "leaver" && effectiveRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only the project leaver can submit gap answers" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid answer" }, { status: 400 });
    }

    const rawAnswer = parsed.data.answer;

    await client.query("BEGIN");

    // Fetch gap and ensure not already answered
    const gapRes = await client.query(
      `SELECT kg.id, kg.project_id, kg.gap_type, kg.status, kg.related_claim_id, kg.related_source_id,
              c.access_tag AS claim_access_tag, s.access_tag AS source_access_tag
       FROM knowledge_gaps kg
       LEFT JOIN claims c ON kg.related_claim_id = c.id
       LEFT JOIN sources s ON kg.related_source_id = s.id
       WHERE kg.id = $1::bigint AND kg.project_id = $2::bigint
       FOR UPDATE`,
      [gapId, projectId]
    );

    if (gapRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Gap not found" }, { status: 404 });
    }

    const gap = gapRes.rows[0];
    if (gap.status === "resolved") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This knowledge gap has already been resolved." }, { status: 409 });
    }

    // Determine access tag (defaults to eng)
    const accessTag = gap.claim_access_tag || gap.source_access_tag || "eng";

    // 1. Run screening / masking function
    const screened = screenText(rawAnswer);
    const maskedAnswer = screened.text;

    // 2. Insert source
    const sourceTitle = `Leaver answer: gap #${gapId}`;
    const srcIns = await client.query(
      `INSERT INTO sources (project_id, title, kind, access_tag, redactions, created_by)
       VALUES ($1::bigint, $2, 'leaver_answer', $3, $4, $5::bigint)
       ON CONFLICT (project_id, title) DO UPDATE
         SET kind = 'leaver_answer', access_tag = EXCLUDED.access_tag
       RETURNING id::text`,
      [projectId, sourceTitle, accessTag, screened.count, session.user.id]
    );
    const sourceId = srcIns.rows[0].id;

    // 3. Insert one chunk with masked text
    const chunkIns = await client.query(
      `INSERT INTO chunks (source_id, position, content, access_tag)
       VALUES ($1::bigint, 0, $2, $3)
       RETURNING id::text`,
      [sourceId, maskedAnswer, accessTag]
    );
    const chunkId = chunkIns.rows[0].id;

    // 4. Determine claim type:
    // decision for decision_no_reason, owner for action_no_owner, dependency for leaver_only
    let claimType = "decision";
    if (gap.gap_type === "action_no_owner") {
      claimType = "owner";
    } else if (gap.gap_type === "leaver_only") {
      claimType = "dependency";
    }

    const statement = await generateStatement(maskedAnswer, claimType);
    // Excerpt MUST be an exact substring of the chunk content
    const excerpt = maskedAnswer.length > 200 ? maskedAnswer.slice(0, 200) : maskedAnswer;

    // 5. Integrity check: excerpt must be an exact substring of chunk content
    const integrityOk = maskedAnswer.includes(excerpt);

    const claimIns = await client.query(
      `INSERT INTO claims
         (project_id, source_id, chunk_id, type, statement, excerpt, access_tag, evidence_status, review_state, integrity_ok, version, created_by)
       VALUES
         ($1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7, 'inferred', 'draft', $8, 1, $9::bigint)
       RETURNING id::text, type, statement, excerpt, review_state, integrity_ok`,
      [
        projectId,
        sourceId,
        chunkId,
        claimType,
        statement,
        excerpt,
        accessTag,
        integrityOk,
        session.user.id,
      ]
    );
    const newClaim = claimIns.rows[0];

    // Store claim_versions row
    await client.query(
      `INSERT INTO claim_versions
         (claim_id, version, statement, excerpt, review_state, evidence_status, changed_by)
       VALUES
         ($1::bigint, 1, $2, $3, 'draft', 'inferred', $4::bigint)`,
      [newClaim.id, statement, excerpt, session.user.id]
    );

    // 6. Update gap
    await client.query(
      `UPDATE knowledge_gaps
       SET status = 'resolved',
           answer = $1,
           answered_claim_id = $2::bigint,
           answered_at = now(),
           updated_at = now()
       WHERE id = $3::bigint`,
      [maskedAnswer, newClaim.id, gapId]
    );

    // 7. Write audit log entries
    await writeAudit({
      userId: session.user.id,
      action: "gap_answered",
      entity: "knowledge_gaps",
      entityId: gapId,
      detail: { projectId, gapId, answeredClaimId: newClaim.id },
    });

    await writeAudit({
      userId: session.user.id,
      action: "claim_created",
      entity: "claims",
      entityId: newClaim.id,
      detail: { projectId, sourceId, claimType, integrityOk },
    });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      gapId,
      status: "resolved",
      answeredClaim: newClaim,
      integrityOk,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
