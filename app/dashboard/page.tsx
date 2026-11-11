import Link from "next/link";
import { FileText, Briefcase, AlertTriangle, User, Plus, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { STATS, READINESS, NEEDS_ATTENTION, ACTIVITY, HANDOVER } from "@/lib/demo-data";

const ICONS = { decisions: FileText, work: Briefcase, risks: AlertTriangle, owners: User } as const;
const card = "rounded-2xl border border-white/10 bg-white/[0.03]";

function Ring({ value }: { value: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${value}% ready`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#8B5CF6" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{value}%</span>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Overview">
      <PageHeader
        title="A little context. A lot of clarity."
        subtitle="Everything you need to leave the work in good hands."
        action={
          <Link href="/capture"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20">
            <Plus size={16} aria-hidden="true" /> Capture knowledge
          </Link>
        }
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = ICONS[s.icon];
          return (
            <div key={s.label} className={`${card} p-5 transition hover:-translate-y-0.5 hover:border-[#6366F1]/40`}>
              <div className="flex items-center justify-between text-sm text-[#A5A5C0]">
                {s.label} <Icon size={16} aria-hidden="true" />
              </div>
              <p className="mt-3 text-4xl font-semibold">{s.value}</p>
              <p className="mt-3 text-sm text-[#A5A5C0]">{s.note}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Handover readiness</h2>
            <span className="rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-1 text-xs text-[#C4B5FD]">In progress</span>
          </div>
          <div className="mt-5 flex items-center gap-6">
            <Ring value={READINESS.percent} />
            <div>
              <p className="font-semibold">Looking good, {HANDOVER.from}.</p>
              <p className="mt-1 text-sm text-[#A5A5C0]">
                {READINESS.done} of {READINESS.total} checks complete. Close the gaps to make your next chapter effortless.
              </p>
              <Link href="/brief" className="mt-3 inline-block text-sm text-[#C4B5FD] hover:underline">
                Review your handover &rarr;
              </Link>
            </div>
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-sm text-[#A5A5C0]">
            Demo readiness: based on owner, reason, and next-step coverage.
          </p>
        </div>

        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Needs attention</h2>
            <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1 text-xs text-[#F59E0B]">
              {NEEDS_ATTENTION.length} gaps
            </span>
          </div>
          <ul className="mt-4 divide-y divide-white/10">
            {NEEDS_ATTENTION.map((n) => {
              const dot = n.tone === "danger" ? "bg-[#F43F5E]" : "bg-[#F59E0B]";
              const inner = (
                <>
                  <span className="flex items-center gap-3 text-sm">
                    <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" /> {n.text}
                  </span>
                  {n.href && <ArrowRight size={16} aria-hidden="true" />}
                </>
              );
              return (
                <li key={n.text}>
                  {n.href ? (
                    <Link href={n.href} className="flex min-h-12 items-center justify-between gap-3 hover:text-[#C4B5FD]">{inner}</Link>
                  ) : (
                    <div className="flex min-h-12 items-center justify-between gap-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-4">
        <div className={`${card} p-6`}>
          <h2 className="font-semibold">Recent activity</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={a.who} size={32} />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium text-[#F4F4FA]">{a.who}</span>{" "}
                      <span className="text-[#A5A5C0]">{a.what}</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#A5A5C0]">{a.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
