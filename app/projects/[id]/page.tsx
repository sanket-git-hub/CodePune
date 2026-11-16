import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getProjectAdminData, isUserProjectAdmin } from "@/lib/projects";
import {
  FolderKanban,
  Users,
  UserPlus,
  Settings,
  Upload,
  FileCheck,
  Send,
  MessageSquare,
  ShieldCheck,
  Mail,
  ArrowRight,
  Calendar,
  AlertTriangle,
  GitCompare,
} from "lucide-react";
import { formatRoleName } from "@/lib/roles";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    notFound();
  }

  const user = await requireUser();

  const data = await getProjectAdminData(id);
  if (!data) {
    notFound();
  }

  const { project, members, invitations } = data;
  const isAdmin = await isUserProjectAdmin(user.id, id, user.role);
  const pendingInvites = invitations.filter((i) => i.status === "pending");

  return (
    <AppShell
      user={user}
      section="Workspace"
      projectName={project.name}
      isDemo={false}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow={`${project.name.toUpperCase()} / WORKSPACE`}
          title={project.name}
          subtitle={
            project.description ||
            "Engineering knowledge continuity and handover workspace."
          }
        />

        {isAdmin && (
          <Link
            href={`/projects/${id}/admin`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
          >
            <UserPlus size={16} />
            <span>Manage Members</span>
          </Link>
        )}
      </div>

      {/* Quick Action Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/projects/${id}/conflicts`}
          className="group rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-5 transition hover:border-[#F43F5E]/60 hover:bg-[#F43F5E]/15"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[#F43F5E]/20 p-2 text-[#FB7185] transition group-hover:scale-110">
              <GitCompare size={18} />
            </span>
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-3 font-semibold text-white">Conflicts &amp; Stale</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Review contradictory technical decisions and stale tasks.
          </p>
        </Link>

        <Link
          href={`/projects/${id}/gaps`}
          className="group rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 transition hover:border-amber-500/60 hover:bg-amber-500/15"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-amber-500/20 p-2 text-amber-300 transition group-hover:scale-110">
              <AlertTriangle size={18} />
            </span>
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-3 font-semibold text-white">Gap Finder</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Audit unreasoned decisions, orphan tasks & single owners.
          </p>
        </Link>

        <Link
          href={`/projects/${id}/plan`}
          className="group rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-5 transition hover:border-[#6366F1]/60 hover:bg-[#6366F1]/15"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[#6366F1]/20 p-2 text-[#C4B5FD] transition group-hover:scale-110">
              <Calendar size={18} />
            </span>
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-3 font-semibold text-white">Day 1 / 7 / 30 Plan</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Milestone roadmap, readiness score & comprehension checks.
          </p>
        </Link>

        <Link
          href="/capture"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <Upload size={20} className="text-[#C4B5FD] transition group-hover:scale-110" />
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-4 font-semibold text-white">Import Knowledge</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Upload PRs, design notes, slack logs or tickets.
          </p>
        </Link>

        <Link
          href="/decisions"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <FileCheck size={20} className="text-[#34D399] transition group-hover:scale-110" />
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-4 font-semibold text-white">Extracted Claims</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Review decisions, blockers, dependencies and owners.
          </p>
        </Link>

        <Link
          href="/brief"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <Send size={20} className="text-[#8B5CF6] transition group-hover:scale-110" />
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-4 font-semibold text-white">Handover Brief</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Synthesize handover report and export to PDF.
          </p>
        </Link>

        <Link
          href="/ask"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <MessageSquare size={20} className="text-[#F59E0B] transition group-hover:scale-110" />
            <ArrowRight size={14} className="text-[#A5A5C0] group-hover:text-white" />
          </div>
          <h3 className="mt-4 font-semibold text-white">Ask Baton AI</h3>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Ask project questions grounded in verified evidence.
          </p>
        </Link>
      </div>

      {/* Members & Invitations Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Team Members */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#C4B5FD]" />
              <h2 className="text-base font-bold text-white">Project Members</h2>
            </div>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#A5A5C0]">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="mt-4 divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                  <p className="text-xs text-[#A5A5C0]">{m.email}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                    m.role === "admin"
                      ? "border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#C4B5FD]"
                      : "border border-white/15 bg-white/5 text-[#A5A5C0]"
                  }`}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#F59E0B]" />
              <h2 className="text-base font-bold text-white">Pending Invitations</h2>
            </div>
            <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
              {pendingInvites.length} pending
            </span>
          </div>

          <div className="mt-4 divide-y divide-white/5">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{inv.invited_email}</p>
                  <p className="text-xs text-[#A5A5C0]">
                    Invited as {formatRoleName(inv.invited_role)}
                  </p>
                </div>
                <span suppressHydrationWarning className="text-[11px] text-[#A5A5C0]">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </div>
            ))}

            {pendingInvites.length === 0 && (
              <p className="py-6 text-center text-xs text-[#A5A5C0]">
                No pending invitations. All invited members have joined!
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="mt-4 border-t border-white/10 pt-4 text-right">
              <Link
                href={`/projects/${id}/admin`}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#C4B5FD] transition hover:text-white"
              >
                <span>Manage all invitations</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
