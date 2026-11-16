import Link from "next/link";
import { Plus, Send, AlertCircle, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { BriefClient } from "./brief-client";
import { listUserProjects, getProjectAdminData } from "@/lib/projects";
import { pool } from "@/lib/db";

export default async function BriefPage() {
  const user = await requireUser();
  const isDemo = Boolean(user.isDemo);

  let projectName = "Campus Pay";
  let members: Array<{ id: string; name: string; email: string; role: string }> = [];
  let pendingInvitations: Array<{ id: string; email: string; role: string; status: string }> = [];
  let claimsCount = 24;
  let hasRealProject = false;
  let activeProjectId: string | undefined = undefined;
  let readinessData: { score: number; itemsDone: number; itemsTotal: number; checksCorrect: number; checksTotal: number } | null = null;

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      hasRealProject = true;
      const activeProj = userProjects[0];
      activeProjectId = activeProj.id;
      projectName = activeProj.name;

      const adminData = await getProjectAdminData(activeProj.id);
      members = (adminData?.members || []).map((m) => ({
        id: m.user_id,
        name: m.name || m.email,
        email: m.email,
        role: m.role,
      }));
      pendingInvitations = (adminData?.invitations || [])
        .filter((i) => i.status === "pending")
        .map((i) => ({
          id: i.id,
          email: i.invited_email,
          role: i.invited_role,
          status: i.status,
        }));

      const { rows } = await pool.query(
        "SELECT COUNT(*)::int AS count FROM claims WHERE project_id = $1::bigint",
        [activeProj.id]
      );
      claimsCount = rows[0]?.count || 0;

      // Query latest readiness score for reviewer
      const planRes = await pool.query(
        `SELECT readiness_score, plan_json, progress,
                COALESCE(checks_json, '[]'::jsonb) AS checks_json,
                COALESCE(answers_json, '{}'::jsonb) AS answers_json
         FROM onboarding_plans
         WHERE project_id = $1::bigint
         ORDER BY updated_at DESC
         LIMIT 1`,
        [activeProj.id]
      );

      if (planRes.rows.length > 0) {
        const pRow = planRes.rows[0];
        const pItems = pRow.plan_json?.items || [];
        const pChecks = pRow.checks_json || [];
        const pProg = pRow.progress || {};
        const pAns = pRow.answers_json || {};

        let itemsDone = 0;
        for (const it of pItems) {
          if (pProg[it.id]) itemsDone++;
        }
        let checksCorrect = 0;
        for (const chk of pChecks) {
          if (pAns[chk.id] !== undefined && pAns[chk.id] === chk.correct_index) checksCorrect++;
        }

        readinessData = {
          score: pRow.readiness_score || 0,
          itemsDone,
          itemsTotal: pItems.length,
          checksCorrect,
          checksTotal: pChecks.length,
        };
      }
    } else {
      projectName = "Workspace";
    }
  }

  // If real user has NO projects, show clean empty state
  if (!isDemo && !hasRealProject) {
    return (
      <AppShell
        user={user}
        section="Handover brief"
        projectName="Workspace"
        isDemo={false}
      >
        <PageHeader
          eyebrow="HANDOVER"
          title="Handover brief"
          subtitle="Generate a verified handover packet for outgoing teammates."
        />

        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <FolderKanban size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No active projects</h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            Handover briefs are generated from active project knowledge and assigned members. Create a project to begin.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/projects/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              Create Project
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      user={user}
      section="Handover brief"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / HANDOVER`}
        title="Handover brief"
        subtitle="One clear document. A confident next chapter."
      />

      <BriefClient
        projectId={activeProjectId}
        projectName={projectName}
        isDemo={isDemo}
        projectMembers={members}
        pendingInvitations={pendingInvitations}
        claimsCount={claimsCount}
        readinessData={readinessData}
      />
    </AppShell>
  );
}
