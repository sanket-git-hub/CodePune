import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { pool } from "@/lib/db";
import { getApprovedClaimsForUser } from "@/lib/onboarding";
import { PlanClient } from "./plan-client";

export default async function ProjectPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    notFound();
  }

  const user = await requireUser();

  // Fetch project details
  const projRes = await pool.query(
    "SELECT id::text, name, description FROM projects WHERE id = $1::bigint",
    [id]
  );
  if (projRes.rows.length === 0) {
    notFound();
  }
  const project = projRes.rows[0];

  // Fetch approved claims for this user
  const claims = await getApprovedClaimsForUser(id, user.id);

  // Fetch existing plan if one exists
  const planRes = await pool.query(
    `SELECT id::text, plan_json, progress,
            COALESCE(checks_json, '[]'::jsonb) AS checks_json,
            COALESCE(answers_json, '{}'::jsonb) AS answers_json,
            readiness_score
     FROM onboarding_plans
     WHERE project_id = $1::bigint AND user_id = $2::bigint
     LIMIT 1`,
    [id, user.id]
  );

  const initialPlan =
    planRes.rows.length > 0
      ? {
          id: planRes.rows[0].id,
          planJson: planRes.rows[0].plan_json,
          progress: planRes.rows[0].progress || {},
          checksJson: planRes.rows[0].checks_json || [],
          answersJson: planRes.rows[0].answers_json || {},
          readinessScore: planRes.rows[0].readiness_score || 0,
        }
      : null;

  return (
    <AppShell
      user={user}
      section="Onboarding Plan"
      projectName={project.name}
      isDemo={Boolean(user.isDemo)}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#A5A5C0] transition hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Project Workspace</span>
        </Link>
      </div>

      <PageHeader
        eyebrow={`${project.name.toUpperCase()} / ONBOARDING ROADMAP`}
        title="Day 1 / 7 / 30 Plan & Readiness"
        subtitle="A verified milestones roadmap and interactive comprehension checks for confident knowledge continuity."
      />

      <PlanClient
        projectId={id}
        projectName={project.name}
        initialPlan={initialPlan}
        claimsCount={claims.length}
        claimsList={claims}
      />
    </AppShell>
  );
}
