import Link from "next/link";
import { Plus, CheckSquare, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WORK_ITEMS, type WorkItem } from "@/lib/demo-data-extra";
import { WorkBoard } from "./work-board";
import { listUserProjects } from "@/lib/projects";
import { pool } from "@/lib/db";

export default async function WorkPage() {
  const user = await requireUser();
  const isDemo = Boolean(user.isDemo);

  let items: WorkItem[] = WORK_ITEMS;
  let projectName = "Campus Pay";

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      const activeProj = userProjects[0];
      projectName = activeProj.name;

      const { rows } = await pool.query(
        `SELECT c.id::text, c.statement AS title, c.excerpt AS detail,
                COALESCE(u.name, 'Unassigned') AS owner,
                CASE c.type WHEN 'blocker' THEN 'Blocked' WHEN 'next_action' THEN 'Next action' ELSE 'Task' END AS state,
                to_char(c.created_at, 'Mon DD') AS due
         FROM claims c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.project_id = $1::bigint AND c.type IN ('next_action', 'blocker', 'task')
         ORDER BY c.created_at DESC`,
        [activeProj.id]
      );

      items = rows.map((r) => {
        let status: any = "not_started";
        if (r.state === "Blocked") status = "blocked";
        else if (r.state === "Next action") status = "in_progress";
        return {
          id: r.id,
          title: r.title,
          owner: (r.owner as any) || "Unassigned",
          status,
          due: r.due || "Pending",
          note: r.detail || "",
        };
      });
    } else {
      items = [];
      projectName = "Workspace";
    }
  }

  return (
    <AppShell
      user={user}
      section="Open work"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / WORK`}
        title="Open work"
        subtitle="No loose ends. Just clear next steps."
      />

      {items.length > 0 ? (
        <WorkBoard initial={items} />
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <CheckSquare size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No open work items for {projectName}
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            Extract action items and blockers from meeting notes or import your project tasks to track handover progress.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/capture"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              Import Tasks
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
