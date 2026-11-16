// app/api/projects/[id]/conflicts/detect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { detectStale, detectContradictions } from "@/lib/conflicts";
import { writeAudit } from "@/lib/audit";

/**
 * POST /api/projects/[id]/conflicts/detect
 * Reviewer/Admin only.
 * Returns counts and a warnings array.
 */
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
        { error: "Forbidden: Reviewer or Admin clearance required" },
        { status: 403 }
      );
    }

    const [staleResult, contradictionResult] = await Promise.all([
      detectStale(projectId, effectiveRole),
      detectContradictions(projectId, effectiveRole),
    ]);

    await writeAudit({
      userId: session.user.id,
      action: "conflicts.detect",
      entity: "claim_conflicts",
      entityId: projectId,
      detail: {
        staleFound: staleResult.staleCount,
        contradictionsFound: contradictionResult.contradictionsCount,
        ruleCount: contradictionResult.detectedByRule,
        geminiCount: contradictionResult.detectedByGemini,
      },
    });

    return NextResponse.json({
      success: true,
      staleCount: staleResult.staleCount,
      contradictionsCount: contradictionResult.contradictionsCount,
      detectedByRule: contradictionResult.detectedByRule,
      detectedByGemini: contradictionResult.detectedByGemini,
      warnings: contradictionResult.warnings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
