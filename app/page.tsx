import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F4F4FA]">
      {/* Navigation */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] font-bold text-white shadow-md shadow-[#6366F1]/20">
              B
            </div>
            <span className="text-lg font-semibold tracking-tight">
              ByeByeBrain
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-4 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition hover:opacity-95"
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#A5A5C0] transition hover:text-[#F4F4FA]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-4 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition hover:opacity-95"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-4 py-1.5 text-xs font-medium text-[#C4B5FD]">
            <Sparkles size={14} />
            <span>Evidence-led, permission-aware handover</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-[1.15]">
            Keep the knowledge. <br />
            <span className="bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
              Pass the project.
            </span>
          </h1>

          <p className="mt-6 text-lg text-[#A5A5C0] sm:text-xl">
            Turn meeting threads, unwritten decisions, and key architecture into
            an approved Claim Ledger before the baton is handed over.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 text-base font-medium text-white shadow-xl shadow-[#6366F1]/25 transition hover:opacity-95"
              >
                Open your dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 text-base font-medium text-white shadow-xl shadow-[#6366F1]/25 transition hover:opacity-95"
                >
                  Start handover demo
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-6 text-base font-medium text-[#F4F4FA] transition hover:bg-white/10"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/10 text-[#8B5CF6]">
              <FileText size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Decision Records
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Preserve the reasons and rejected alternatives behind key choices,
              not just the final code commits.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B]">
              <AlertTriangle size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Risk Register
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Spot unmonitored systems, missing backups, and blocked flows before
              they turn into post-handover surprises.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
              <Users size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Ownership Continuity
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Map primary owners and designated backups for every critical area
              so nobody is left wondering who to call.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
              <ShieldCheck size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Permission-Aware
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Role-based access tags (public, eng, hr, finance) ensure team
              members only see what their clearance permits.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EC4899]/10 text-[#EC4899]">
              <Sparkles size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Quick Knowledge Capture
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Paste brain-dumps, slack chats, or incident notes to extract
              structured decisions, owners, and risks instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6366F1]/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#C4B5FD]">
              <Layers size={20} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#F4F4FA]">
              Handover Brief
            </h2>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Consolidated readiness checklist and summary packet for clean,
              frictionless knowledge transitions.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#A5A5C0]">
        <p>&copy; {new Date().getFullYear()} ByeByeBrain. Keep the knowledge. Pass the project.</p>
      </footer>
    </div>
  );
}
