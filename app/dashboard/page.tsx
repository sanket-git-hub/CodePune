import Link from "next/link";
import {
  FileText,
  Briefcase,
  AlertTriangle,
  User,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
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

  return (
    <AppShell user={user} section="Overview">
      <PageHeader
        eyebrow="CAMPUS PAY / OVERVIEW"
        title="A little context. A lot of clarity."
        subtitle="Here’s where your handover stands."
      />

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
        {/* Recent activity */}
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

        {/* The Story so far Banner Card */}
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
