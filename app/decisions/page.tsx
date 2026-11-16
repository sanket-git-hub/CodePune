import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DECISIONS, type Decision } from "@/lib/demo-data";
import { DecisionList } from "./decision-list";
import { listUserProjects } from "@/lib/projects";
import { pool } from "@/lib/db";

export default async function DecisionsPage() {
  const user = await requireUser();
  const isDemo =
    Boolean(user.email?.endsWith("@demo.byebyebrain.test")) ||
    user.id === "demo-priya";

  let decisions: Decision[] = DECISIONS;
  let projectName = "Campus Pay";

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      const activeProj = userProjects[0];
      projectName = activeProj.name;

      const { rows } = await pool.query(
        `SELECT c.id::text, c.statement AS title, c.excerpt AS why, c.access_tag AS tag,
                to_char(c.created_at, 'Mon DD, YYYY') AS date,
                COALESCE(u.name, 'Team') AS by
         FROM claims c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.project_id = $1::bigint AND c.type = 'decision'
         ORDER BY c.created_at DESC`,
        [activeProj.id]
      );

      decisions = rows.map((r) => ({
        id: r.id,
        tag: (r.tag || "eng").toUpperCase(),
        date: r.date || "Recent",
        title: r.title,
        by: (r.by as any) || "Team",
        why: r.why,
        rejected: "Captured from verified project sources.",
      }));
    } else {
      decisions = [];
      projectName = "Workspace";
    }
  }

  return (
    <AppShell
      user={user}
      section="Decisions"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / CLAIMS`}
        title="Decisions"
        subtitle="The what, the why, and the roads not taken."
        action={
          <Link
            href="/capture"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 hover:opacity-95"
          >
            <Plus size={16} aria-hidden="true" /> Add decision
          </Link>
        }
      />

      {decisions.length > 0 ? (
        <DecisionList decisions={decisions} />
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <FolderKanban size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No decisions recorded yet for {projectName}
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            Import Slack threads, GitHub pull requests, or design documents to automatically extract and preserve architecture decisions.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/capture"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              Import Knowledge
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
