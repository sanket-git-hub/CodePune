import { z } from "zod";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearanceFor } from "@/lib/permissions";

export const askInputSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty").max(300, "Maximum 300 characters"),
});

const geminiResponseSchema = z.object({
  answer: z.string(),
  claim_ids: z.array(z.union([z.string(), z.number()])).default([]),
});

export type AskSourceClaim = {
  id: string;
  type: string;
  statement: string;
  excerpt: string;
  access_tag: string;
  evidence_status: string;
};

export type AskResult = {
  answer: string;
  citedClaims: AskSourceClaim[];
};

// In-memory rate limiting: 10 questions per minute per user
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (rateLimits.get(userId) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= 10) {
    return false;
  }

  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return true;
}

/**
 * Executes Q&A over approved handover claims.
 * Allowed: incoming, reviewer, admin, leaver. NOT outsider.
 * Handover must be 'approved'.
 */
export async function askHandover({
  userId,
  userRole,
  projectId,
  question,
}: {
  userId: string;
  userRole: string;
  projectId?: string;
  question: string;
}): Promise<AskResult> {
  // 1. Role validation: NOT outsider
  if (userRole === "outsider") {
    throw new Error("Forbidden: Outsiders cannot access Ask Q&A");
  }
  const allowedRoles = ["incoming", "reviewer", "admin", "leaver"];
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized role");
  }

  // 2. Validate question
  const parsed = askInputSchema.safeParse({ question });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid question");
  }
  const cleanQuestion = parsed.data.question;

  // 3. Rate limiting check (10 questions per minute per user)
  if (!checkRateLimit(userId)) {
    throw new Error("Rate limit exceeded: Maximum 10 questions per minute. Please wait.");
  }

  // 4. Verify handover status is 'approved' for this project
  const handoverCheck = await pool.query(
    `SELECT id, status
     FROM handovers
     WHERE status = 'approved'
       AND ($1::bigint IS NULL OR project_id = $1::bigint)
     LIMIT 1`,
    [projectId ?? null]
  );

  if (handoverCheck.rows.length === 0) {
    throw new Error("Ask is only available when the project handover status is approved.");
  }

  // 5. Full-text search retrieval BEFORE any AI call
  // Conditions: project_id = current project AND review_state='approved' AND access_tag = ANY(clearance)
  const clearance = clearanceFor(userRole);

  const { rows } = await pool.query(
    `SELECT id::text, type, statement, excerpt, access_tag, evidence_status,
            ts_rank_cd(to_tsvector('english', statement), plainto_tsquery('english', $1)) AS rank
     FROM claims
     WHERE review_state = 'approved'
       AND access_tag = ANY($2::text[])
       AND ($3::bigint IS NULL OR project_id = $3::bigint)
       AND (
         plainto_tsquery('english', $1) @@ to_tsvector('english', statement)
         OR $1 = ''
         OR statement ILIKE ('%' || $1 || '%')
       )
     ORDER BY rank DESC, id ASC
     LIMIT 8`,
    [cleanQuestion, clearance, projectId ?? null]
  );

  const candidateClaims: AskSourceClaim[] = rows;

  if (candidateClaims.length === 0) {
    const emptyAnswer = "I can't find this in the approved handover.";
    await writeAudit({
      userId,
      action: "ask.query",
      entity: "handover",
      detail: { question: cleanQuestion, claims_retrieved: 0, cited_ids: [] },
    });
    return { answer: emptyAnswer, citedClaims: [] };
  }

  // 6. Gemini Generation (Server-side only)
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const claimsPromptContext = candidateClaims
    .map((c) => `[Claim #${c.id}] Type: ${c.type}\nStatement: ${c.statement}\nExcerpt: ${c.excerpt}`)
    .join("\n\n");

  const systemInstructions = `You are a strict knowledge retrieval assistant for a project handover.
Rules:
1. Answer ONLY using facts directly stated in the provided approved claims below.
2. If the provided claims do not contain enough facts to answer the question, respond with: "I can't find this in the approved handover."
3. Cite the claim IDs you used in the 'claim_ids' array.
4. Output strict JSON adhering to schema: {"answer": string, "claim_ids": string[]}.`;

  const prompt = `${systemInstructions}

Approved Claims:
${claimsPromptContext}

User Question:
"${cleanQuestion}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No response generated by Gemini");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error("Invalid JSON returned by Gemini");
  }

  const validated = geminiResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("Invalid answer format from Gemini");
  }

  const rawCited = validated.data.claim_ids.map(String);
  // Drop any cited id not in the retrieved candidate list
  const validIds = new Set(candidateClaims.map((c) => c.id));
  const filteredCitedIds = rawCited.filter((id) => validIds.has(id));

  const citedClaims = candidateClaims.filter((c) => filteredCitedIds.includes(c.id));

  // 7. Write audit_log
  await writeAudit({
    userId,
    action: "ask.query",
    entity: "handover",
    detail: {
      question: cleanQuestion,
      claims_retrieved: candidateClaims.length,
      cited_ids: filteredCitedIds,
    },
  });

  return {
    answer: validated.data.answer,
    citedClaims,
  };
}
