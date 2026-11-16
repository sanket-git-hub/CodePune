// app/api/projects/[id]/gaps/detect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { detectGaps } from "@/lib/gaps";
import { writeAudit } from "@/lib/audit";

export async function POST(
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

    // Role check: reviewer, admin, or leaver
    const { rows: memberRows } = await pool.query(
      `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE u.id = $2::bigint`,
      [projectId, session.user.id]
    );

    const effectiveRole = memberRows[0]?.role || "incoming";
    if (effectiveRole !== "admin" && effectiveRole !== "reviewer" && effectiveRole !== "leaver") {
      return NextResponse.json(
        { error: "Forbidden: Reviewer, Admin, or Leaver clearance required" },
        { status: 403 }
      );
    }

    const result = await detectGaps(projectId);

    await writeAudit({
      userId: session.user.id,
      action: "gaps.detect",
      entity: "knowledge_gaps",
      entityId: projectId,
      detail: result,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
