"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles, Layers, Plus } from "lucide-react";

function BatonLogo() {
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
        Baton<span className="text-[#8B5CF6]">.</span>
      </span>
    </div>
  );
}

const FAQS = [
  {
    q: "Do I need an account?",
    a: "No login. No setup. Open the demo and explore a pre-filled project.",
  },
  {
    q: "Where is my knowledge saved?",
    a: "Demo decisions, work, and risks are saved on this device. They are not synced to a server.",
  },
  {
    q: "Does Baton use live AI?",
    a: "This prototype uses local, rule-based extraction and keyword-matched answers. Review captured items before saving.",
  },
];

const TEAMS = [
  "Product & engineering",
  "Customer success",
  "Operations",
  "Growing teams",
];

export function HomeClient() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeTeam, setActiveTeam] = useState<string>("Product & engineering");
  const [activeTab, setActiveTab] = useState<"overview" | "story" | "risks">("overview");

  return (
    <div className="min-h-screen bg-[#07070D] text-[#F4F4FA]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07070D]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BatonLogo />

          <nav className="hidden items-center gap-8 text-sm text-[#A5A5C0] md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <Link href="/story" className="transition hover:text-white">
              The story
            </Link>
            <Link href="/dashboard" className="transition hover:text-white">
              Explore demo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6366F1] px-4 text-xs font-semibold text-white shadow-md shadow-[#6366F1]/25 transition hover:bg-[#5558E6]"
            >
              Try demo &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 text-center md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-3.5 py-1 text-xs font-medium text-[#C4B5FD]">
            <span>✦ A better way to pass the baton</span>
            <span className="text-white/40">·</span>
            <span>Meet Baton &rarr;</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl md:leading-[1.12]">
            When someone leaves, <br />
            the knowledge{" "}
            <span className="text-[#8B5CF6]">shouldn’t.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-[#A5A5C0] sm:text-lg">
            Decisions, ownership, and all the little things in between. Baton
            keeps your team’s context connected — so the next person picks up in
            minutes, not months.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/30 transition hover:opacity-95"
            >
              Try the live demo &rarr;
            </Link>
            <Link
              href="/capture"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-[#F4F4FA] transition hover:bg-white/10"
            >
              Start a project <Plus size={16} />
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#A5A5C0]">
            ✓ No login. No setup. Just a smoother handover.
          </p>
        </div>

        {/* Interactive App Mockup Preview */}
        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E1A] p-2 shadow-2xl shadow-[#6366F1]/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#F43F5E]/60" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
              <span className="h-3 w-3 rounded-full bg-[#10B981]/60" />
              <span className="ml-2 text-xs text-[#A5A5C0]">Orbit workspace · Baton preview</span>
            </div>
            <div className="flex gap-1.5 text-xs">
              {(["overview", "story", "risks"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  className={`rounded-md px-2.5 py-1 capitalize transition ${
                    activeTab === t
                      ? "bg-[#6366F1] text-white"
                      : "text-[#A5A5C0] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 text-left">
            {activeTab === "overview" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                  <p className="text-xs text-[#A5A5C0]">Decisions preserved</p>
                  <p className="mt-2 text-3xl font-bold">24</p>
                  <p className="mt-1 text-xs text-[#8B5CF6]">The why behind the work</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                  <p className="text-xs text-[#A5A5C0]">Handover readiness</p>
                  <p className="mt-2 text-3xl font-bold text-[#34D399]">72%</p>
                  <p className="mt-1 text-xs text-[#A5A5C0]">18 of 25 checks complete</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                  <p className="text-xs text-[#A5A5C0]">Needs attention</p>
                  <p className="mt-2 text-3xl font-bold text-[#F59E0B]">2 gaps</p>
                  <p className="mt-1 text-xs text-[#FB7185]">Payments has no backup owner</p>
                </div>
              </div>
            )}

            {activeTab === "story" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">Chapter 02 · March</p>
                  <p className="mt-1 font-semibold text-white">The great gateway debate</p>
                  <p className="mt-1 text-xs text-[#A5A5C0]">Aarav chose Stripe over Razorpay: better docs, faster onboarding.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#F5A84B]">Plot twist · June</p>
                  <p className="mt-1 font-semibold text-white">Forty orders. One silent failure.</p>
                  <p className="mt-1 text-xs text-[#A5A5C0]">Webhook silently dropped 40 orders. Added retry logic, alerting still needed.</p>
                </div>
              </div>
            )}

            {activeTab === "risks" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs">
                  <span className="font-semibold text-[#FB7185]">● High: Webhook failures can go unnoticed</span>
                  <span className="text-[#A5A5C0]">Payments &middot; Aarav</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs">
                  <span className="font-semibold text-[#FB7185]">● High: Payments has no backup owner</span>
                  <span className="text-[#A5A5C0]">Ownership &middot; Aarav</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-xs">
                  <span className="font-semibold text-[#F59E0B]">● Medium: Refund launch blocked by legal</span>
                  <span className="text-[#A5A5C0]">Billing &middot; Zoya</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quotes Ticker */}
        <div className="mt-14 border-y border-white/5 py-4 text-xs text-[#A5A5C0]/80">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <span>&ldquo;Why, not just the what.&rdquo;</span>
            <span className="text-white/20">&bull;</span>
            <span>&ldquo;Pass the work, not the confusion.&rdquo;</span>
            <span className="text-white/20">&bull;</span>
            <span>&ldquo;A handover should be a conversation, not a scavenger hunt.&rdquo;</span>
          </div>
        </div>
      </section>

      {/* Target Audience Tabs */}
      <section className="border-t border-white/5 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
          Built for the teams that keep things moving
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 px-4">
          {TEAMS.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setActiveTeam(team)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                activeTeam === team
                  ? "border border-[#6366F1]/50 bg-[#6366F1]/15 text-white"
                  : "border border-white/10 bg-white/[0.02] text-[#A5A5C0] hover:text-white"
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      </section>

      {/* Feature Cards Section (01 / 02) */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">
              Less chasing. More clarity.
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              A handover, not a scavenger hunt.
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#A5A5C0]">
            From &ldquo;it’s all in my head&rdquo; to &ldquo;you’ve got this.&rdquo;
            Keep the why with the work, every step of the way.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Card 01 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-[#6366F1]/40">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
              ✦ 01 / CAPTURE
            </span>
            <h3 className="mt-4 text-xl font-bold text-white">
              Your brain-dump. Beautifully organized.
            </h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Paste notes, a Slack thread, or the things you’ve been meaning to
              write down. Find the knowledge hiding in the noise.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#0B0B14] p-4 text-xs italic text-[#D1D1E6]">
              &ldquo;We went with Stripe for the better docs. Aarav owns payments.
              Refunds are blocked on legal. Don’t forget the webhook
              monitoring...&rdquo;
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-[#A5A5C0]">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">1 decision</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">1 owner</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">2 next steps</span>
            </div>
          </div>

          {/* Card 02 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-[#6366F1]/40">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
              ⊞ 02 / CONNECT
            </span>
            <h3 className="mt-4 text-xl font-bold text-white">
              Nothing lives in isolation.
            </h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Connect every decision to its owner, every risk to a next step. The
              whole picture, finally in one place.
            </p>

            <div className="mt-8 flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0B14] p-4 text-xs">
              <span className="rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3 py-1.5 font-medium text-[#C4B5FD]">
                Decision
              </span>
              <span className="text-[#A5A5C0]">&rarr;</span>
              <span className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5 font-medium text-[#34D399]">
                Owner
              </span>
              <span className="text-[#A5A5C0]">&rarr;</span>
              <span className="rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1.5 font-medium text-white">
                Handover
              </span>
            </div>

            <p className="mt-6 text-xs text-[#A5A5C0]">
              Map dependencies before they break in production.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Benefit Columns */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white">Less guesswork.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Preserve the why behind every decision.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white">Minutes, not months.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              A faster start for the next person.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white">Nothing left behind.</h3>
            <p className="mt-2 text-sm text-[#A5A5C0]">
              Make the invisible knowledge visible.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
            A little more context
          </p>
          <h2 className="mt-2 text-3xl font-bold">Questions, answered.</h2>
        </div>

        <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
          {FAQS.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div key={faq.q} className="p-5">
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 text-[#A5A5C0] ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm text-[#A5A5C0] leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Callout Banner */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="font-serif italic text-2xl text-[#E2E8F0] sm:text-3xl">
            &ldquo;Good handovers are invisible. <br />
            Bad ones are remembered forever.&rdquo;
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
            Make your next chapter a good one.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-6 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/30 transition hover:bg-[#5558E6]"
            >
              Pass the baton &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#A5A5C0]">
          <BatonLogo />
          <p>Pass the work, not the confusion. &copy; 2026 Baton</p>
        </div>
      </footer>
    </div>
  );
}
