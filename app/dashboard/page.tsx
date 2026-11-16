import Link from "next/link";
import {
  FileText,
  Briefcase,
  AlertTriangle,
  User,
  ArrowRight,
  BookOpen,
  FolderKanban,
  Plus,
  Users,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { listUserProjects, getProjectAdminData } from "@/lib/projects";
import { pool } from "@/lib/db";
import {
  STATS,
  READINESS,
  NEEDS_ATTENTION,
  ACTIVITY,
  HANDOVER,
} from "@/lib/demo-data";

const ICONS = {
  decisions: FileText,
  work: Briefcase,
  risks: AlertTriangle,
  owners: User,
} as const;

function Ring({ value }: { value: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${value}% ready`}
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
        {value}%
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isDemo =
    Boolean(user.email?.endsWith("@demo.byebyebrain.test")) ||
    user.id === "demo-priya";

  // If not a demo user, load their real projects from Neon PostgreSQL
  const userProjects = isDemo ? [] : await listUserProjects(user.id, user.role);

  // 1. NON-DEMO USER WITH NO PROJECTS -> Clean Empty State
  if (!isDemo && userProjects.length === 0) {
    return (
      <AppShell
        user={user}
        section="Overview"
        projectName="Workspace"
        isDemo={false}
        handover={null}
      >
        <PageHeader
          eyebrow="YOUR WORKSPACE"
          title={`Welcome, ${user.name || "Engineer"}`}
          subtitle="Here’s where your project handovers and architecture decisions live."
        />

        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <FolderKanban size={32} />
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">No active projects yet</h2>
          <p className="mt-2 max-w-md text-sm text-[#A5A5C0]">
            You are signed in with your personal account. Create your first project workspace to start capturing decisions, tasks, and inviting team members.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-6 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              <span>Create New Project</span>
            </Link>

            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Browse Workspaces
            </Link>
          </div>

          <p className="mt-8 text-xs text-[#82829E]">
            Looking for the sample platform? You can test the pre-seeded interactive demo anytime from the sign-in page.
          </p>
        </div>
      </AppShell>
    );
  }

  // 2. NON-DEMO USER WITH REAL PROJECTS -> Load Real Project Metrics
  if (!isDemo && userProjects.length > 0) {
    const activeProject = userProjects[0];
    const projectAdminData = await getProjectAdminData(activeProject.id);

    // Query real counts from Neon
    const claimsRes = await pool.query(
      `SELECT type, COUNT(*)::int AS count
       FROM claims
       WHERE project_id = $1::bigint
       GROUP BY type`,
      [activeProject.id]
    );

    const claimCounts: Record<string, number> = {};
    for (const r of claimsRes.rows) {
      claimCounts[r.type] = r.count;
    }

    const decisionsCount = claimCounts.decision || 0;
    const workCount = (claimCounts.next_action || 0) + (claimCounts.blocker || 0);
    const risksCount = claimCounts.risk || 0;
    const membersCount = projectAdminData?.members.length || activeProject.member_count || 1;

    const realStats = [
      {
        label: "Decisions",
        value: decisionsCount,
        note: "Captured & verified",
        icon: "decisions" as const,
      },
      {
        label: "Work items",
        value: workCount,
        note: "Next steps & actions",
        icon: "work" as const,
      },
      {
        label: "Risks",
        value: risksCount,
        note: `${risksCount} tracked`,
        icon: "risks" as const,
      },
      {
        label: "Members",
        value: membersCount,
        note: "Active team",
        icon: "owners" as const,
      },
    ];

    return (
      <AppShell
        user={user}
        section="Overview"
        projectName={activeProject.name}
        isDemo={false}
        handover={null}
      >
        <PageHeader
          eyebrow={`${activeProject.name.toUpperCase()} / OVERVIEW`}
          title={activeProject.name}
          subtitle={
            activeProject.description ||
            "Real-time engineering knowledge and continuity status."
          }
        />

        {/* Workspaces Switcher Banner */}
        <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2.5">
            <FolderKanban size={18} className="text-[#C4B5FD]" />
            <div>
              <p className="text-sm font-semibold text-white">Active Project</p>
              <p className="text-xs text-[#A5A5C0]">
                Viewing real project records from Neon PostgreSQL.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3.5 text-xs font-medium text-white transition hover:bg-white/10"
            >
              Switch Projects ({userProjects.length})
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#6366F1] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4F46E5]"
            >
              <span>+ New Project</span>
            </Link>
          </div>
        </div>

        {/* 4 Real Stat Cards */}
        <section
          aria-label="Totals"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {realStats.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 static-hover-card"
              >
                <div className="flex items-center justify-between text-sm text-[#A5A5C0]">
                  <span>{s.label}</span>
                  <Icon size={16} aria-hidden="true" className="text-[#A5A5C0]" />
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-2 text-xs text-[#A5A5C0]">{s.note}</p>
              </div>
            );
          })}
        </section>

        {/* Quick Links */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/capture"
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
          >
            <h3 className="font-semibold text-white">Import Knowledge &rarr;</h3>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Upload source discussions, PR threads, and deployment notes.
            </p>
          </Link>
          <Link
            href="/decisions"
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
          >
            <h3 className="font-semibold text-white">Review Claims &rarr;</h3>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Review AI-extracted decisions, dependencies, and risks.
            </p>
          </Link>
          <Link
            href={`/projects/${activeProject.id}/admin`}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05]"
          >
            <h3 className="font-semibold text-white">Invite Teammates &rarr;</h3>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Manage members and send 7-day email invitations.
            </p>
          </Link>
        </section>
      </AppShell>
    );
  }

  // 3. DEMO USER -> Render Pre-seeded Campus Pay Demo
  return (
    <AppShell
      user={user}
      section="Overview"
      projectName="Campus Pay"
      isDemo={true}
      handover={HANDOVER}
    >
      <PageHeader
        eyebrow="CAMPUS PAY / OVERVIEW"
        title="A little context. A lot of clarity."
        subtitle="Here’s where your handover stands."
      />

      {/* Projects Banner */}
      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <p className="text-sm font-semibold text-white">Interactive Demo Mode</p>
          <p className="text-xs text-[#A5A5C0]">
            You are viewing the pre-seeded Campus Pay demonstration workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            View Projects
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#6366F1] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4F46E5]"
          >
            <span>+ New Project</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <section
        aria-label="Totals"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {STATS.map((s) => {
          const Icon = ICONS[s.icon];
          return (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 static-hover-card"
            >
              <div className="flex items-center justify-between text-sm text-[#A5A5C0]">
                <span>{s.label}</span>
                <Icon size={16} aria-hidden="true" className="text-[#A5A5C0]" />
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-2 text-xs text-[#A5A5C0]">
                {s.label === "Risks" ? "2 need attention" : "Captured & connected"}
              </p>
            </div>
          );
        })}
      </section>

      {/* Middle Section: Readiness & Needs Attention */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Handover readiness */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6 static-hover-card">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Handover readiness</h2>
              <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                Sample illustration
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-6">
              <Ring value={READINESS.percent} />
              <div className="space-y-1.5">
                <p className="text-base font-semibold">Looking good, {HANDOVER.from}.</p>
                <p className="text-xs text-[#A5A5C0]">
                  A few loose ends. Let’s tie them up.
                </p>
                <div className="pt-1">
                  <span className="inline-block rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 text-xs font-medium text-[#34D399]">
                    {READINESS.done} of {READINESS.total} checks complete
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#A5A5C0]">
            <span>Your knowledge is in good hands.</span>
            <Link
              href="/work"
              className="text-xs font-medium text-[#C4B5FD] hover:text-white focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Keep going &rarr;
            </Link>
          </div>
        </div>

        {/* Needs attention */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6 static-hover-card">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Needs attention</h2>
              <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                {NEEDS_ATTENTION.length} gaps
              </span>
            </div>

            <ul className="mt-4 divide-y divide-white/5">
              {NEEDS_ATTENTION.map((n) => {
                const dot = n.tone === "danger" ? "bg-[#F43F5E]" : "bg-[#F59E0B]";
                const inner = (
                  <div className="flex min-h-12 w-full items-center justify-between gap-3 text-sm hover:text-[#C4B5FD]">
                    <span className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                      {n.text}
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-[#A5A5C0]" />
                  </div>
                );
                return (
                  <li key={n.text}>
                    {n.href ? (
                      <Link href={n.href} className="focus-visible:outline-2 focus-visible:outline-[#6366F1]">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom Section: Recent activity & The Story so Far */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 static-hover-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <span className="text-xs text-[#A5A5C0]">This week</span>
          </div>

          <ul className="mt-4 divide-y divide-white/5">
            {ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-3 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={a.who} size={32} />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium text-[#F4F4FA]">{a.who}</span>{" "}
                      <span className="text-[#A5A5C0]">· {a.what}</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#A5A5C0]">{a.when}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#12121F] p-6 static-hover-card">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
              <BookOpen size={13} />
              THE STORY SO FAR
            </span>
            <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-white">
              Not just what happened. <br />
              Why it mattered.
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              From the first MVP to the great gateway debate. Get the context
              behind the work before you start your chapter.
            </p>
          </div>

          <div className="mt-6 pt-4">
            <Link
              href="/story"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#C4B5FD] hover:text-white focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Read your project’s story &rarr;
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
