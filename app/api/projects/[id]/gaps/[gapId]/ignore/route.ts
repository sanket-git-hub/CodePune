// app/api/projects/[id]/gaps/[gapId]/ignore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

/**
 * POST /api/projects/[id]/gaps/[gapId]/ignore
 * Reviewer/Admin only.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; gapId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, gapId } = await context.params;
    if (!projectId || !/^\d+$/.test(projectId) || !gapId || !/^\d+$/.test(gapId)) {
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
        { error: "Forbidden: Reviewer or Admin clearance required to ignore gaps" },
        { status: 403 }
      );
    }

    const { rowCount } = await pool.query(
      `UPDATE knowledge_gaps
       SET status = 'ignored', updated_at = now()
       WHERE id = $1::bigint AND project_id = $2::bigint AND status <> 'resolved'`,
      [gapId, projectId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { error: "Gap not found or cannot ignore a resolved gap" },
        { status: 400 }
      );
    }

    await writeAudit({
      userId: session.user.id,
      action: "gap_ignored",
      entity: "knowledge_gaps",
      entityId: gapId,
      detail: { projectId, gapId },
    });

    return NextResponse.json({ success: true, status: "ignored" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
