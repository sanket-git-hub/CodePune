// app/api/projects/[id]/conflicts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { clearanceFor } from "@/lib/permissions";

/**
 * GET /api/projects/[id]/conflicts?status=open
 * List conflicts with both claims' statement, excerpt and source title,
 * filtered by the requesting user's clearance.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    if (!projectId || !/^\d+$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // Role check
    const { rows: memberRows } = await pool.query(
      `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE u.id = $2::bigint`,
      [projectId, session.user.id]
    );

    const effectiveRole = memberRows[0]?.role || "incoming";
    const clearance = clearanceFor(effectiveRole);

    const statusFilter = req.nextUrl.searchParams.get("status") || "open";

    const { rows } = await pool.query(
      `SELECT cc.id::text, cc.project_id::text, cc.kind, cc.reason, cc.detected_by,
              cc.status, cc.resolution, cc.resolution_note, cc.resolved_at::text,
              cc.is_planted, cc.created_at::text,
              ca.id::text AS claim_a_id, ca.statement AS claim_a_statement, ca.excerpt AS claim_a_excerpt,
              ca.type AS claim_a_type, ca.created_at::text AS claim_a_created_at,
              sa.title AS claim_a_source_title,
              cb.id::text AS claim_b_id, cb.statement AS claim_b_statement, cb.excerpt AS claim_b_excerpt,
              cb.type AS claim_b_type, cb.created_at::text AS claim_b_created_at,
              sb.title AS claim_b_source_title,
              u.name AS resolver_name
       FROM claim_conflicts cc
       JOIN claims ca ON cc.claim_a_id = ca.id
       LEFT JOIN sources sa ON ca.source_id = sa.id
       LEFT JOIN claims cb ON cc.claim_b_id = cb.id
       LEFT JOIN sources sb ON cb.source_id = sb.id
       LEFT JOIN users u ON cc.resolved_by = u.id
       WHERE cc.project_id = $1::bigint
         AND ($2::text = 'all' OR cc.status = $2)
         AND ca.access_tag = ANY($3::text[])
         AND (cb.id IS NULL OR cb.access_tag = ANY($3::text[]))
       ORDER BY CASE cc.status WHEN 'open' THEN 1 ELSE 2 END, cc.created_at DESC`,
      [projectId, statusFilter, clearance]
    );

    return NextResponse.json({
      projectId,
      conflicts: rows,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
