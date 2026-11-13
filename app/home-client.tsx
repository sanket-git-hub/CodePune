"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Check, ShieldCheck, Lock, FileText, User, AlertTriangle } from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
        <rect
          x="5"
          y="3"
          width="6"
          height="14"
          rx="3"
          transform="rotate(20 8 10)"
          fill="#8B5CF6"
        />
        <rect
          x="13"
          y="9"
          width="6"
          height="14"
          rx="3"
          transform="rotate(20 16 16)"
          fill="#6366F1"
        />
      </svg>
      <span className="text-xl font-semibold tracking-tight text-white">
        ByeByeBrain<span className="text-[#8B5CF6]">.</span>
      </span>
    </div>
  );
}

export function HomeClient() {
  return (
    <div className="min-h-screen bg-[#07070D] font-sans text-[#F4F4FA]">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070D]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Logo />

          <nav className="hidden items-center gap-8 text-sm text-[#A5A5C0] md:flex">
            <a href="#how-it-works" className="hover:text-white focus-visible:outline-2 focus-visible:outline-[#6366F1]">
              How it works
            </a>
            <Link href="/dashboard" className="hover:text-white focus-visible:outline-2 focus-visible:outline-[#6366F1]">
              Demo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-lg bg-[#6366F1] px-4 text-xs font-semibold text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Try the demo
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-semibold text-[#F4F4FA] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="px-6 pt-16 pb-16 text-center md:pt-24 md:pb-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#C4B5FD]">
            A better way to pass the baton
          </p>

          <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-6xl md:text-7xl md:leading-[1.15]">
            When someone leaves, <br />
            the knowledge <span className="italic text-[#8B5CF6]">shouldn’t.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-[#A5A5C0] sm:text-lg">
            Keep decisions, ownership, and risks connected so the next person picks up in minutes, not months.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-6 text-sm font-semibold text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Try the demo &rarr;
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-[#F4F4FA] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Create account
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#A5A5C0]">
            One-click demo accounts. No setup.
          </p>
        </div>

        {/* 3. Static Product Mockup Card */}
        <div className="mx-auto mt-12 max-w-5xl rounded-xl border border-white/10 bg-[#0E0E1A] p-4 text-left sm:p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#F43F5E]/60" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
              <span className="h-3 w-3 rounded-full bg-[#10B981]/60" />
              <span className="ml-2 text-xs text-[#A5A5C0]">Campus Pay · Baton Overview</span>
            </div>
            <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
              Sample illustration
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4">
              <div className="flex items-center justify-between text-xs text-[#A5A5C0]">
                <span>Decisions</span>
                <FileText size={14} />
              </div>
              <p className="mt-2 text-2xl font-bold">24</p>
              <p className="mt-1 text-xs text-[#A5A5C0]">Captured & connected</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4">
              <div className="flex items-center justify-between text-xs text-[#A5A5C0]">
                <span>Open work</span>
                <Check size={14} />
              </div>
              <p className="mt-2 text-2xl font-bold">12</p>
              <p className="mt-1 text-xs text-[#A5A5C0]">In flight & backlog</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4">
              <div className="flex items-center justify-between text-xs text-[#A5A5C0]">
                <span>Risks</span>
                <AlertTriangle size={14} />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#FB7185]">5</p>
              <p className="mt-1 text-xs text-[#FB7185]">2 need attention</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4">
              <div className="flex items-center justify-between text-xs text-[#A5A5C0]">
                <span>Owners</span>
                <User size={14} />
              </div>
              <p className="mt-2 text-2xl font-bold">4</p>
              <p className="mt-1 text-xs text-[#A5A5C0]">Key teammates</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4 text-xs">
              <p className="font-semibold text-white">Handover Status: Campus Pay</p>
              <p className="mt-1 text-[#A5A5C0]">Leaver: Riya &rarr; Incoming: Arjun</p>
              <div className="mt-3 rounded border border-white/5 bg-[#0B0B14] p-3 text-[#A5A5C0]">
                Approved handovers give Arjun immediate visibility into all public and engineering claims.
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#12121F] p-4 text-xs">
              <p className="font-semibold text-[#F59E0B]">Needs attention</p>
              <ul className="mt-2 space-y-1.5 text-[#A5A5C0]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
                  Payments has no backup owner
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                  Refund launch blocked by legal
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Static Quote Row (3 Quotes) */}
        <div className="mx-auto mt-16 max-w-5xl border-y border-white/10 py-8">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            <div className="p-3">
              <p className="font-serif italic text-sm text-[#E2E8F0] sm:text-base">
                &ldquo;Document the why, not just the what.&rdquo;
              </p>
            </div>
            <div className="border-t border-white/5 p-3 sm:border-t-0 sm:border-l sm:border-white/10">
              <p className="font-serif italic text-sm text-[#E2E8F0] sm:text-base">
                &ldquo;Pass the work, not the confusion.&rdquo;
              </p>
            </div>
            <div className="border-t border-white/5 p-3 sm:border-t-0 sm:border-l sm:border-white/10">
              <p className="font-serif italic text-sm text-[#E2E8F0] sm:text-base">
                &ldquo;A handover should be a conversation, not a scavenger hunt.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Target Audience Section */}
      <section className="border-b border-white/10 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
          BUILT FOR THE TEAMS THAT KEEP THINGS MOVING
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 px-4">
          {[
            "Product and engineering",
            "Customer success",
            "Operations",
            "Growing teams",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-xs font-medium text-[#D1D1E6]"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* 6. A handover, not a scavenger hunt (3 Alternating Rows) */}
      <section id="how-it-works" className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="border-b border-white/10 pb-6 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">
            Clear step-by-step
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
            A handover, not a scavenger hunt.
          </h2>
        </div>

        <div className="mt-12 space-y-12">
          {/* Row 01 */}
          <div className="grid items-center gap-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2 lg:p-8">
            <div>
              <span className="inline-block rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
                01 / IMPORT
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                Your notes. Turned into claims.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
                Import plain text, CSV or meeting notes. Secrets, emails, and phone numbers are automatically masked before any processing. Claims are extracted with exact verbatim source excerpts so every statement is backed by evidence.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-5 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[#A5A5C0]">
                <span>Source: Eng design note</span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#34D399]">Screened & masked</span>
              </div>
              <p className="mt-3 font-mono text-[11px] text-[#A5A5C0]">
                &ldquo;We chose Stripe over Razorpay and PayU because of better documentation...&rdquo;
              </p>
              <div className="mt-4 rounded border border-[#6366F1]/30 bg-[#6366F1]/10 p-3 text-[#C4B5FD]">
                <p className="font-semibold text-white">Extracted Claim (decision)</p>
                <p className="mt-1">Stripe selected for primary payment gateway</p>
              </div>
            </div>
          </div>

          {/* Row 02 */}
          <div className="grid items-center gap-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2 lg:p-8">
            <div className="order-2 md:order-1 rounded-lg border border-white/10 bg-[#0B0B14] p-5 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-semibold text-white">Claim #42: Stripe Decision</span>
                <span className="rounded bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-medium text-[#34D399]">Verified</span>
              </div>
              <div className="mt-3 space-y-2 text-[#A5A5C0]">
                <p><strong className="text-white">Owner:</strong> Aarav (Primary) · Priya (Incoming)</p>
                <p><strong className="text-white">Clearance:</strong> <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">eng</span></p>
                <p><strong className="text-white">Integrity:</strong> Exact substring match verified</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="inline-block rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
                02 / CONNECT
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                Nothing lives in isolation.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
                Every claim is linked directly to its source chunk, owner, access tag, and review status. Human reviewers edit, approve, or reject claims before anything is exposed.
              </p>
            </div>
          </div>

          {/* Row 03 */}
          <div className="grid items-center gap-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2 lg:p-8">
            <div>
              <span className="inline-block rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 text-xs font-semibold text-[#34D399]">
                03 / HAND OVER
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                Leave the context. Not the confusion.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
                Once a handover is approved by a reviewer, the incoming person gains a clean, role-filtered view of everything they are authorized to read, with an explicit count of items hidden by clearance.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-5 text-xs">
              <div className="rounded border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-[#34D399]">
                ✓ Handover approved · Ready for incoming signoff
              </div>
              <div className="mt-3 flex items-center justify-between text-[#A5A5C0]">
                <span>Showing 18 approved claims</span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">2 confidential items hidden</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Three Outcome Cards */}
      <section className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center sm:text-left">
            <h3 className="font-serif text-2xl font-semibold text-white">Less guesswork.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Preserve the why behind every decision.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center sm:text-left">
            <h3 className="font-serif text-2xl font-semibold text-white">Minutes, not months.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              A faster start for the next person.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center sm:text-left">
            <h3 className="font-serif text-2xl font-semibold text-white">Nothing left behind.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Make the invisible knowledge visible.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ (All Expanded, Static) */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
            A little more context
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">Questions, answered.</h2>
        </div>

        <div className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white">Do I need an account?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
              Create an account, or use the one-click demo accounts.
            </p>
          </div>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white">Where is my knowledge saved?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
              In your project&apos;s PostgreSQL database, only visible to members of that project.
            </p>
          </div>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white">Does it use live AI?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A5A5C0]">
              Yes. Gemini extracts claims on the server. A human reviews and approves every claim before it is shared.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Closing Quote and Demo CTA */}
      <section className="border-t border-white/10 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="font-serif italic text-2xl text-[#E2E8F0] sm:text-3xl">
            &ldquo;Good handovers are invisible. Bad ones are remembered forever.&rdquo;
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-6 text-sm font-semibold text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Try the demo &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#A5A5C0]">
          <Logo />
          <p>ByeByeBrain. Keep the knowledge. Pass the project. &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
