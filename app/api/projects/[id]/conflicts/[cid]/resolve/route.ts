// app/api/projects/[id]/conflicts/[cid]/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const resolveSchema = z.object({
  resolution: z.enum(["keep_a", "keep_b", "both_valid", "dismiss"]),
  note: z.string().optional(),
});

/**
 * POST /api/projects/[id]/conflicts/[cid]/resolve
 * Reviewer/Admin only.
 * One transaction:
 * - Sets conflict status ('resolved' or 'dismissed')
 * - For keep_a/keep_b: rejects the other claim and writes a claim_versions row
 * - Idempotent: resolving twice returns the existing result
 * - Writes audit_log
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; cid: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, cid } = await context.params;
    if (!projectId || !/^\d+$/.test(projectId) || !cid || !/^\d+$/.test(cid)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Role check: reviewer or admin
    const { rows: memberRows } = await pool.query(
      `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE u.id = $2::bigint`,
      [projectId, session.user.id]
    );

    const effectiveRole = memberRows[0]?.role || "incoming";
    if (effectiveRole !== "admin" && effectiveRole !== "reviewer") {
      return NextResponse.json(
        { error: "Forbidden: Reviewer or Admin clearance required to resolve conflicts" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resolution payload" }, { status: 400 });
    }

    const { resolution, note } = parsed.data;

    await client.query("BEGIN");

    // Fetch conflict row FOR UPDATE
    const conflictRes = await client.query(
      `SELECT id, project_id, kind, claim_a_id, claim_b_id, status, resolution, resolution_note
       FROM claim_conflicts
       WHERE id = $1::bigint AND project_id = $2::bigint
       FOR UPDATE`,
      [cid, projectId]
    );

    if (conflictRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    const conflict = conflictRes.rows[0];

    // Idempotent: resolving twice returns existing result
    if (conflict.status === "resolved" || conflict.status === "dismissed") {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: true,
        alreadyResolved: true,
        status: conflict.status,
        resolution: conflict.resolution,
        resolutionNote: conflict.resolution_note,
      });
    }

    const newStatus = resolution === "dismiss" ? "dismissed" : "resolved";

    // If keep_a, reject claim_b; if keep_b, reject claim_a
    let rejectedClaimId: string | null = null;
    if (resolution === "keep_a" && conflict.claim_b_id) {
      rejectedClaimId = String(conflict.claim_b_id);
    } else if (resolution === "keep_b" && conflict.claim_a_id) {
      rejectedClaimId = String(conflict.claim_a_id);
    }

    if (rejectedClaimId) {
      // Fetch rejected claim to record in claim_versions
      const claimRes = await client.query(
        `SELECT id, statement, excerpt, review_state, evidence_status, version
         FROM claims
         WHERE id = $1::bigint`,
        [rejectedClaimId]
      );

      if (claimRes.rows.length > 0) {
        const c = claimRes.rows[0];
        const newVersion = (c.version || 1) + 1;

        // Update claim to rejected
        await client.query(
          `UPDATE claims
           SET review_state = 'rejected', version = $1, updated_at = now()
           WHERE id = $2::bigint`,
          [newVersion, rejectedClaimId]
        );

        // Store claim_versions row
        await client.query(
          `INSERT INTO claim_versions
             (claim_id, version, statement, excerpt, review_state, evidence_status, changed_by)
           VALUES
             ($1::bigint, $2, $3, $4, 'rejected', $5, $6::bigint)`,
          [rejectedClaimId, newVersion, c.statement, c.excerpt, c.evidence_status, session.user.id]
        );
      }
    }

    // Update conflict status
    await client.query(
      `UPDATE claim_conflicts
       SET status = $1,
           resolution = $2,
           resolution_note = $3,
           resolved_by = $4::bigint,
           resolved_at = now(),
           updated_at = now()
       WHERE id = $5::bigint`,
      [newStatus, resolution, note?.trim() || null, session.user.id, cid]
    );

    // Audit log
    await writeAudit({
      userId: session.user.id,
      action: "conflict_resolved",
      entity: "claim_conflicts",
      entityId: cid,
      detail: {
        projectId,
        conflictId: cid,
        resolution,
        rejectedClaimId,
        newStatus,
      },
    });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      conflictId: cid,
      status: newStatus,
      resolution,
      rejectedClaimId,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
