"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, ArrowRight, CornerDownLeft, ShieldCheck } from "lucide-react";

type QAPair = {
  question: string;
  answer: string;
  source: string;
  tag: string;
};

const PRESET_QA: Record<string, QAPair> = {
  "Why did we choose Stripe?": {
    question: "Why did we choose Stripe?",
    answer:
      "We chose Stripe over Razorpay and PayU because of better documentation, faster onboarding time, and reliable international payments. The decision was made in March 2026 after two weeks of testing.",
    source: "Decision #d01 · March 12, 2026 by Aarav",
    tag: "Payments",
  },
  "What is blocked right now?": {
    question: "What is blocked right now?",
    answer:
      "Two work streams are currently blocked: 1) Finish refund flow (70% complete in the payments repo, blocked on legal approval), and 2) Resolve legal approval (waiting for the updated refund policy signoff).",
    source: "Work Board · Tasks w6 & w7",
    tag: "Open work",
  },
  "What should I do first?": {
    question: "What should I do first?",
    answer:
      "Top priorities for the handover: 1) Pair with Aarav to record a payments walkthrough and designate backup ownership, 2) Add webhook failure alerting to prevent silent dropped orders, 3) Review the refund draft with legal.",
    source: "Handover Brief · Priya's Next Chapter",
    tag: "Priority",
  },
  "Who owns billing?": {
    question: "Who owns billing?",
    answer:
      "Billing and Payments are primarily owned by Aarav. Currently there is no designated backup owner, which is flagged as a high-severity handover risk.",
    source: "Ownership Map · Payments Area",
    tag: "Ownership",
  },
};

const SUGGESTIONS = [
  "Why did we choose Stripe?",
  "What is blocked right now?",
  "What should I do first?",
  "Who owns billing?",
];

export function AskClient() {
  const [query, setQuery] = useState("");
  const [activeQA, setActiveQA] = useState<QAPair | null>(null);

  const handleAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);

    // Check preset match or keyword match
    if (PRESET_QA[trimmed]) {
      setActiveQA(PRESET_QA[trimmed]);
      return;
    }

    const lower = trimmed.toLowerCase();
    if (lower.includes("stripe") || lower.includes("payment")) {
      setActiveQA(PRESET_QA["Why did we choose Stripe?"]);
    } else if (lower.includes("block") || lower.includes("legal")) {
      setActiveQA(PRESET_QA["What is blocked right now?"]);
    } else if (lower.includes("who") || lower.includes("own") || lower.includes("billing")) {
      setActiveQA(PRESET_QA["Who owns billing?"]);
    } else {
      setActiveQA(PRESET_QA["What should I do first?"]);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-4">
      {/* Hero Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
          <Sparkles size={13} />
          Your Team’s Memory
        </span>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
          The context you need. <br />
          <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#C4B5FD] bg-clip-text text-transparent">
            Without the scavenger hunt.
          </span>
        </h1>

        <p className="mt-4 text-sm text-[#A5A5C0]">
          Ask anything. Baton answers only from what your team has captured.
        </p>
        <p className="mt-1 text-xs text-[#A5A5C0]/60">
          Local demo &middot; keyword-matched answers, not a live language model
        </p>
      </div>

      {/* 2x2 Suggested Prompts */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleAsk(s)}
            className="flex min-h-[52px] items-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-[#F4F4FA] transition hover:border-[#6366F1]/50 hover:bg-white/[0.04]"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Answer or Empty State */}
      <div className="mt-8">
        {activeQA ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                {activeQA.tag} &middot; Grounded context
              </span>
              <span className="flex items-center gap-1 text-xs text-[#34D399]">
                <ShieldCheck size={14} /> Screened claim
              </span>
            </div>

            <p className="mt-4 text-base font-medium text-[#F4F4FA]">
              &ldquo;{activeQA.question}&rdquo;
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#D1D1E6]">
              {activeQA.answer}
            </p>

            <div className="mt-5 rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs text-[#A5A5C0]">
              <span className="font-semibold text-white/70">Citation: </span>
              {activeQA.source}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center">
            <MessageSquare size={24} className="text-[#A5A5C0]/60" />
            <p className="mt-3 text-sm text-[#A5A5C0]">
              Ask anything. Baton answers only from what your team has captured.
            </p>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(query);
        }}
        className="mt-8 flex gap-3"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about decisions, work, or ownership..."
            className="h-12 w-full rounded-xl border border-white/10 bg-[#12121F] px-4 text-sm text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition active:scale-[0.98]"
        >
          <ArrowRight size={16} />
          Ask Baton
        </button>
      </form>
    </div>
  );
}
