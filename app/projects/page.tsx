import Link from "next/link";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { listUserProjects } from "@/lib/projects";
import { FolderKanban, Plus, Users, ShieldCheck, ArrowRight, Settings } from "lucide-react";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listUserProjects(user.id, user.role);

  return (
    <AppShell user={user} section="Projects" isDemo={false}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="WORKSPACES"
          title="Projects"
          subtitle="All projects you have access to or manage."
        />
        <Link
          href="/projects/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] focus-visible:outline-2 focus-visible:outline-[#6366F1]"
        >
          <Plus size={18} />
          <span>New Project</span>
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((proj) => {
          const isCampusPay = proj.name === "Campus Pay";
          const isAdmin = proj.is_project_admin || user.role === "admin";

          return (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40 hover:bg-white/[0.05]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1]/15 text-[#C4B5FD]">
                      <FolderKanban size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{proj.name}</h3>
                      <p suppressHydrationWarning className="text-xs text-[#A5A5C0]">
                        Created {new Date(proj.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-0.5 text-[11px] font-medium text-[#C4B5FD]">
                      <ShieldCheck size={12} />
                      Admin
                    </span>
                  )}
                </div>

                <p className="mt-4 line-clamp-2 text-sm text-[#A5A5C0]">
                  {proj.description ||
                    (isCampusPay
                      ? "Engineering and architecture handover workspace for the payment platform."
                      : "No description provided for this project.")}
                </p>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-xs text-[#A5A5C0]">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {proj.member_count} {proj.member_count === 1 ? "member" : "members"}
                  </span>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Link
                        href={`/projects/${proj.id}/admin`}
                        title="Manage invitations and members"
                        className="rounded p-1 text-[#A5A5C0] transition hover:bg-white/10 hover:text-white"
                      >
                        <Settings size={15} />
                      </Link>
                    )}
                    <Link
                      href={isCampusPay ? "/dashboard" : `/projects/${proj.id}`}
                      className="inline-flex items-center gap-1 font-medium text-[#C4B5FD] transition hover:text-white"
                    >
                      <span>Open</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/10 text-[#C4B5FD]">
            <FolderKanban size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No projects yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#A5A5C0]">
            Create your first project to start capturing engineering knowledge and inviting teammates.
          </p>
          <Link
            href="/projects/new"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-4 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
          >
            <Plus size={16} />
            Create Project
          </Link>
        </div>
      )}
    </AppShell>
  );
}
