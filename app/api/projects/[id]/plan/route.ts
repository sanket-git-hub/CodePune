// app/api/projects/[id]/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  getApprovedClaimsForUser,
  generatePlan,
  computeReadinessScore,
  type StoredPlan,
} from "@/lib/onboarding";
import { z } from "zod";

async function getUserAndProjectRole(userId: string, projectId: string) {
  const { rows } = await pool.query(
    `SELECT u.id::text, u.name, u.email, u.role AS global_role,
            COALESCE(pm.role, u.role, 'incoming') AS effective_role
     FROM users u
     LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
     WHERE u.id = $2::bigint`,
    [projectId, userId]
  );
  return rows[0] || null;
}

/**
 * GET /api/projects/[id]/plan
 * The incoming user gets their own plan.
 * Reviewer/Admin can read any user's plan for the project (via ?userId= or first available).
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

    const user = await getUserAndProjectRole(session.user.id, projectId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId") || user.id;

    const isStaff = user.effective_role === "admin" || user.effective_role === "reviewer";

    // Non-staff can ONLY read their own plan
    if (!isStaff && targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Cannot access other users' plans" }, { status: 403 });
    }

    // Query existing plan
    const { rows } = await pool.query(
      `SELECT id::text, project_id::text, user_id::text, plan_json, progress,
              COALESCE(checks_json, '[]'::jsonb) AS checks_json,
              COALESCE(answers_json, '{}'::jsonb) AS answers_json,
              readiness_score, created_at, updated_at
       FROM onboarding_plans
       WHERE project_id = $1::bigint AND user_id = $2::bigint
       LIMIT 1`,
      [projectId, targetUserId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const row = rows[0];
    return NextResponse.json({
      plan: {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        planJson: row.plan_json,
        progress: row.progress || {},
        checksJson: row.checks_json || [],
        answersJson: row.answers_json || {},
        readinessScore: row.readiness_score || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/plan
 * ONLY the incoming user of the project.
 * Generates and upserts into onboarding_plans.
 * If one exists, returns it unless ?regenerate=1.
 * Debounces double-clicks.
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

    const user = await getUserAndProjectRole(session.user.id, projectId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Role check: incoming user only (or admin assisting)
    if (user.effective_role !== "incoming" && user.effective_role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only incoming engineers can generate their onboarding plan" },
        { status: 403 }
      );
    }

    const regenerate = req.nextUrl.searchParams.get("regenerate") === "1";

    // 1. Check existing plan (debouncing double-clicks)
    const existing = await pool.query(
      `SELECT id::text, plan_json, progress,
              COALESCE(checks_json, '[]'::jsonb) AS checks_json,
              COALESCE(answers_json, '{}'::jsonb) AS answers_json,
              readiness_score, updated_at
       FROM onboarding_plans
       WHERE project_id = $1::bigint AND user_id = $2::bigint
       LIMIT 1`,
      [projectId, user.id]
    );

    if (existing.rows.length > 0 && !regenerate) {
      const row = existing.rows[0];
      return NextResponse.json({
        plan: {
          id: row.id,
          planJson: row.plan_json,
          progress: row.progress || {},
          checksJson: row.checks_json || [],
          answersJson: row.answers_json || {},
          readinessScore: row.readiness_score || 0,
        },
      });
    }

    // 2. Fetch approved claims for this user (SQL clearance filter runs BEFORE Gemini)
    const claims = await getApprovedClaimsForUser(projectId, user.id);
    if (claims.length === 0) {
      return NextResponse.json(
        { error: "Nothing approved for you yet. Please request claims approval before generating your plan." },
        { status: 400 }
      );
    }

    // 3. Generate plan via Gemini or Rule fallback
    const storedPlan: StoredPlan = await generatePlan(claims);

    const progress: Record<string, boolean> = {};
    const answers: Record<string, number> = {};
    const readinessScore = computeReadinessScore(storedPlan.items, progress, storedPlan.checks, answers);

    // 4. Upsert into onboarding_plans
    const { rows } = await pool.query(
      `INSERT INTO onboarding_plans
         (project_id, user_id, plan_json, progress, checks_json, answers_json, readiness_score, updated_at)
       VALUES
         ($1::bigint, $2::bigint, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, now())
       ON CONFLICT (project_id, user_id) DO UPDATE SET
         plan_json = EXCLUDED.plan_json,
         progress = EXCLUDED.progress,
         checks_json = EXCLUDED.checks_json,
         answers_json = EXCLUDED.answers_json,
         readiness_score = EXCLUDED.readiness_score,
         updated_at = now()
       RETURNING id::text, plan_json, progress, checks_json, answers_json, readiness_score`,
      [
        projectId,
        user.id,
        JSON.stringify(storedPlan),
        JSON.stringify(progress),
        JSON.stringify(storedPlan.checks),
        JSON.stringify(answers),
        readinessScore,
      ]
    );

    // 5. Audit log
    await writeAudit({
      userId: user.id,
      action: "plan_generated",
      entity: "onboarding_plan",
      entityId: rows[0].id,
      detail: {
        projectId,
        source: storedPlan.meta.source,
        itemCount: storedPlan.items.length,
        checkCount: storedPlan.checks.length,
      },
    });

    return NextResponse.json({
      plan: {
        id: rows[0].id,
        planJson: rows[0].plan_json,
        progress: rows[0].progress,
        checksJson: rows[0].checks_json,
        answersJson: rows[0].answers_json,
        readinessScore: rows[0].readiness_score,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const patchSchema = z.object({
  itemId: z.string().optional(),
  done: z.boolean().optional(),
  checkId: z.string().optional(),
  choice: z.number().int().min(0).max(3).optional(),
});

/**
 * PATCH /api/projects/[id]/plan
 * { itemId, done } toggles progress.
 * { checkId, choice } stores an answer (only first answer counts; reject changes).
 * Readiness score is recomputed and saved.
 */
export async function PATCH(
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

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { itemId, done, checkId, choice } = parsed.data;

    // Fetch existing plan
    const { rows } = await pool.query(
      `SELECT id::text, plan_json, progress,
              COALESCE(checks_json, '[]'::jsonb) AS checks_json,
              COALESCE(answers_json, '{}'::jsonb) AS answers_json,
              readiness_score
       FROM onboarding_plans
       WHERE project_id = $1::bigint AND user_id = $2::bigint
       LIMIT 1`,
      [projectId, session.user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const planRow = rows[0];
    const planJson: StoredPlan = planRow.plan_json;
    const progress: Record<string, boolean> = planRow.progress || {};
    const checks: any[] = planRow.checks_json || [];
    const answers: Record<string, number> = planRow.answers_json || {};

    let actionTaken = "";

    // 1. Toggle item progress
    if (itemId !== undefined && done !== undefined) {
      progress[itemId] = done;
      actionTaken = "plan_item_toggled";
      await writeAudit({
        userId: session.user.id,
        action: "plan_item_toggled",
        entity: "onboarding_plan",
        entityId: planRow.id,
        detail: { itemId, done },
      });
    }

    // 2. Submit comprehension check answer
    if (checkId !== undefined && choice !== undefined) {
      // Rule: Only first answer counts; reject changes
      if (answers[checkId] !== undefined) {
        return NextResponse.json(
          { error: "Comprehension check already answered. Answers cannot be changed." },
          { status: 409 }
        );
      }

      answers[checkId] = choice;
      actionTaken = "check_answered";
      const targetCheck = checks.find((c) => c.id === checkId);
      const isCorrect = targetCheck ? targetCheck.correct_index === choice : false;

      await writeAudit({
        userId: session.user.id,
        action: "check_answered",
        entity: "onboarding_plan",
        entityId: planRow.id,
        detail: { checkId, choice, isCorrect },
      });
    }

    // Recompute readiness score
    const newScore = computeReadinessScore(planJson.items || [], progress, checks, answers);

    // Update in database
    await pool.query(
      `UPDATE onboarding_plans
       SET progress = $1::jsonb,
           answers_json = $2::jsonb,
           readiness_score = $3,
           updated_at = now()
       WHERE id = $4::bigint`,
      [JSON.stringify(progress), JSON.stringify(answers), newScore, planRow.id]
    );

    return NextResponse.json({
      success: true,
      action: actionTaken,
      progress,
      answersJson: answers,
      readinessScore: newScore,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
