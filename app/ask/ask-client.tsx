"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { askQuestionAction } from "@/app/actions/ask-actions";
import type { AskResult } from "@/lib/ask";

const SUGGESTIONS = [
  "Why did we choose Stripe?",
  "What is blocked right now?",
  "What should I do first?",
  "Who owns billing?",
];

export function AskClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");

  const handleAsk = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setCurrentQuestion(trimmed);

    try {
      const res = await askQuestionAction(trimmed);
      if (!res.success) {
        setError(res.error || "Failed to process question");
        setResult(null);
      } else {
        setResult(res.data || null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-4">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
          <Sparkles size={13} />
          Your Team’s Memory
        </span>

        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
          The context you need. <br />
          <span className="text-[#8B5CF6]">
            Without the scavenger hunt.
          </span>
        </h1>

        <p className="mt-4 text-sm text-[#A5A5C0]">
          Ask anything. Baton answers only from approved handover claims you are cleared to read.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery(s);
              handleAsk(s);
            }}
            disabled={loading}
            className="flex min-h-[50px] items-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-[#F4F4FA] hover:border-[#6366F1]/50 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4 text-sm text-[#FB7185]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Error asking handover</p>
            <p className="mt-1 text-xs text-[#FB7185]/90">{error}</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <Loader2 size={24} className="animate-spin text-[#6366F1]" />
            <p className="mt-3 text-sm text-[#A5A5C0]">Searching approved claims & querying Gemini...</p>
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                Grounded Handover Answer
              </span>
              <span className="flex items-center gap-1 text-xs text-[#34D399]">
                <ShieldCheck size={14} /> Permission-filtered claims
              </span>
            </div>

            <p className="mt-4 font-serif text-lg font-medium text-[#F4F4FA]">
              &ldquo;{currentQuestion}&rdquo;
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#D1D1E6]">
              {result.answer}
            </p>

            {/* Source Cards */}
            {result.citedClaims.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                  Sources & Cited Claims ({result.citedClaims.length})
                </p>
                <div className="space-y-2">
                  {result.citedClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="rounded-xl border border-white/10 bg-[#0B0B14] p-4 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          Claim #{claim.id} · <span className="capitalize">{claim.type}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-[#A5A5C0]">
                            {claim.access_tag}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              claim.evidence_status === "verified"
                                ? "bg-[#10B981]/20 text-[#34D399]"
                                : "bg-[#6366F1]/20 text-[#C4B5FD]"
                            }`}
                          >
                            {claim.evidence_status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[#F4F4FA] font-medium">{claim.statement}</p>
                      <blockquote className="mt-2 rounded border-l-2 border-[#6366F1] bg-white/[0.02] py-1 pl-3 font-mono text-[11px] text-[#A5A5C0]">
                        &ldquo;{claim.excerpt}&rdquo;
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center">
            <MessageSquare size={24} className="text-[#A5A5C0]/60" />
            <p className="mt-3 text-sm text-[#A5A5C0]">
              Ask anything. Baton answers only from approved handover claims.
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
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about decisions, risks, or ownership (max 300 chars)..."
            disabled={loading}
            className="h-12 w-full rounded-xl border border-white/10 bg-[#12121F] px-4 text-sm text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#6366F1] px-6 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Ask Baton
        </button>
      </form>
    </div>
  );
}
