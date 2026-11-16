// app/api/projects/[id]/readiness/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { isUserProjectAdmin } from "@/lib/projects";

/**
 * GET /api/projects/[id]/readiness
 * Reviewer/Admin only.
 * Returns per-recipient score, items done / total, checks correct / total.
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

    // Role check: reviewer or admin only
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
        { error: "Forbidden: Reviewer or Admin clearance required to view readiness dashboard" },
        { status: 403 }
      );
    }

    // Query all onboarding plans for this project
    const { rows } = await pool.query(
      `SELECT op.id::text, op.user_id::text, op.readiness_score, op.plan_json, op.progress,
              COALESCE(op.checks_json, '[]'::jsonb) AS checks_json,
              COALESCE(op.answers_json, '{}'::jsonb) AS answers_json,
              op.updated_at::text,
              u.name, u.email, COALESCE(pm.role, u.role, 'incoming') AS member_role
       FROM onboarding_plans op
       JOIN users u ON op.user_id = u.id
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE op.project_id = $1::bigint
       ORDER BY op.readiness_score DESC, op.updated_at DESC`,
      [projectId]
    );

    const recipients = rows.map((r) => {
      const items = (r.plan_json?.items as any[]) || [];
      const checks = (r.checks_json as any[]) || [];
      const progress = (r.progress as Record<string, boolean>) || {};
      const answers = (r.answers_json as Record<string, number>) || {};

      let itemsDone = 0;
      for (const it of items) {
        if (progress[it.id] === true) itemsDone++;
      }

      let checksCorrect = 0;
      for (const chk of checks) {
        if (answers[chk.id] !== undefined && answers[chk.id] === chk.correct_index) {
          checksCorrect++;
        }
      }

      return {
        userId: r.user_id,
        name: r.name || r.email,
        email: r.email,
        role: r.member_role,
        score: r.readiness_score,
        itemsDone,
        itemsTotal: items.length,
        checksCorrect,
        checksTotal: checks.length,
        updatedAt: r.updated_at,
      };
    });

    const averageScore =
      recipients.length > 0
        ? Math.round(recipients.reduce((acc, r) => acc + r.score, 0) / recipients.length)
        : 0;

    return NextResponse.json({
      projectId,
      totalRecipients: recipients.length,
      averageScore,
      recipients,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
