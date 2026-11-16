// app/api/projects/[id]/gaps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

/**
 * GET /api/projects/[id]/gaps
 * List gaps with status.
 * Leaver sees open gaps assigned to them (or all open gaps for the project).
 * Reviewer/Admin see all.
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
    const isStaff = effectiveRole === "admin" || effectiveRole === "reviewer";
    const isLeaver = effectiveRole === "leaver";

    if (!isStaff && !isLeaver && effectiveRole !== "incoming") {
      return NextResponse.json({ error: "Forbidden: Access restricted" }, { status: 403 });
    }

    // Query gaps
    let query = `
      SELECT kg.id::text, kg.project_id::text, kg.title, kg.description, kg.severity,
             kg.status, kg.gap_type, kg.question, kg.answer, kg.related_claim_id::text,
             kg.related_source_id::text, kg.answered_claim_id::text, kg.answered_at::text,
             kg.created_at::text, kg.updated_at::text,
             rc.statement AS related_claim_statement, rc.type AS related_claim_type,
             rs.title AS related_source_title,
             ac.statement AS answered_claim_statement, ac.review_state AS answered_claim_review_state
      FROM knowledge_gaps kg
      LEFT JOIN claims rc ON kg.related_claim_id = rc.id
      LEFT JOIN sources rs ON kg.related_source_id = rs.id
      LEFT JOIN claims ac ON kg.answered_claim_id = ac.id
      WHERE kg.project_id = $1::bigint
    `;
    const params: any[] = [projectId];

    if (isLeaver) {
      // Leaver sees open gaps assigned to them or unassigned, plus their answered ones
      query += ` AND (kg.suggested_owner_user_id = $2::bigint OR kg.suggested_owner_user_id IS NULL OR kg.status = 'resolved')`;
      params.push(session.user.id);
    }

    query += ` ORDER BY CASE kg.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END, kg.created_at DESC`;

    const { rows } = await pool.query(query, params);

    return NextResponse.json({
      projectId,
      gaps: rows,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
