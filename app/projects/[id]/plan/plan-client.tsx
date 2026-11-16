"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  FileText,
  Zap,
  Target,
  Check,
  Award,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { StoredPlan, PlanItem, ComprehensionCheck } from "@/lib/onboarding";

interface PlanClientProps {
  projectId: string;
  projectName: string;
  initialPlan: {
    id: string;
    planJson: StoredPlan;
    progress: Record<string, boolean>;
    checksJson: ComprehensionCheck[];
    answersJson: Record<string, number>;
    readinessScore: number;
  } | null;
  claimsCount: number;
  claimsList: Array<{ id: number; statement: string; type: string; excerpt?: string }>;
}

export function PlanClient({
  projectId,
  projectName,
  initialPlan,
  claimsCount,
  claimsList,
}: PlanClientProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [activeTab, setActiveTab] = useState<"day1" | "day7" | "day30">("day1");
  const [loading, setLoading] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick claim lookup map for evidence
  const claimMap = new Map(claimsList.map((c) => [c.id, c]));

  // Handle Generate / Regenerate
  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/projects/${projectId}/plan${regenerate ? "?regenerate=1" : ""}`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }
      setPlan(data.plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating plan");
    } finally {
      setLoading(false);
    }
  };

  // Handle Item Checkbox Toggle
  const handleToggleItem = async (itemId: string, done: boolean) => {
    if (!plan) return;
    setPatchingId(itemId);
    // Optimistic update
    const prevProgress = { ...plan.progress };
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            progress: { ...prev.progress, [itemId]: done },
          }
        : null
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, done }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update item");
      }
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              progress: data.progress,
              readinessScore: data.readinessScore,
            }
          : null
      );
    } catch (err: unknown) {
      // Revert on failure
      setPlan((prev) => (prev ? { ...prev, progress: prevProgress } : null));
      setError(err instanceof Error ? err.message : "Failed to toggle item");
    } finally {
      setPatchingId(null);
    }
  };

  // Handle Answering Comprehension Check
  const handleAnswerCheck = async (checkId: string, choiceIndex: number) => {
    if (!plan || plan.answersJson[checkId] !== undefined) return;
    setPatchingId(checkId);

    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId, choice: choiceIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              answersJson: data.answersJson,
              readinessScore: data.readinessScore,
            }
          : null
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setPatchingId(null);
    }
  };

  // Empty state: no approved claims for user
  if (claimsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <AlertCircle size={32} />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">No Approved Claims Available</h2>
        <p className="mt-2 max-w-md text-sm text-[#A5A5C0]">
          Onboarding plans require verified project claims approved by a reviewer or admin. Once claims are reviewed, you can generate your customized Day 1, 7, and 30 roadmap.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
          >
            <ArrowLeft size={16} />
            Back to Project Workspace
          </Link>
        </div>
      </div>
    );
  }

  // Not yet generated
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-12 text-center backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD] shadow-lg shadow-[#6366F1]/20">
          <Calendar size={32} />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-white">Generate Your Onboarding Roadmap</h2>
        <p className="mt-2 max-w-md text-sm text-[#A5A5C0] leading-relaxed">
          Baton synthesizes your {claimsCount} verified project claims into structured Day 1, Day 7, and Day 30 milestones alongside interactive comprehension checks.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3.5 text-xs text-[#FB7185]">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="mt-6 inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-7 text-sm font-semibold text-white shadow-xl shadow-[#6366F1]/30 transition hover:opacity-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Generating AI Synthesized Plan...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate My Onboarding Plan</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const items: PlanItem[] = plan.planJson?.items || [];
  const checks: ComprehensionCheck[] = plan.checksJson || [];
  const progress = plan.progress || {};
  const answers = plan.answersJson || {};

  const currentTabItems = items.filter((it) => it.horizon === activeTab);
  const doneItemsCount = items.filter((it) => progress[it.id]).length;
  const answeredChecksCount = Object.keys(answers).length;
  const correctChecksCount = checks.filter((c) => answers[c.id] === c.correct_index).length;

  return (
    <div className="space-y-8">
      {/* Hero Overview & Readiness Gauge */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-6 backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-semibold text-[#34D399]">
                <ShieldCheck size={13} />
                {plan.planJson?.meta?.source === "gemini" ? "AI Grounded Milestone Plan" : "Rule Synthesized Roadmap"}
              </span>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Regenerate
              </button>
            </div>

            <h2 className="mt-3 text-2xl font-extrabold text-white tracking-tight">Onboarding Roadmap &bull; {projectName}</h2>
            <p className="mt-1 text-xs text-[#A5A5C0] leading-relaxed">
              Step-by-step verified trajectory derived from {plan.planJson?.meta?.claims_count || claimsCount} project decisions and handovers. Complete milestones and answer comprehension checks to raise your readiness score.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-[#A5A5C0]">Overall Onboarding Readiness</span>
              <span className="font-extrabold text-[#34D399] text-sm">{plan.readinessScore}% Complete</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 p-0.5 border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#10B981] transition-all duration-700 shadow-sm shadow-[#10B981]/50"
                style={{ width: `${Math.min(100, Math.max(0, plan.readinessScore))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Readiness Breakdown Widget */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">Readiness Score</p>
              <Award size={18} className="text-[#FBBF24]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{plan.readinessScore}</span>
              <span className="text-sm font-bold text-[#A5A5C0]">/ 100</span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 rounded-xl border border-white/5 bg-black/30 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#A5A5C0]">Milestones Done:</span>
              <span className="font-bold text-white">{doneItemsCount} / {items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A5A5C0]">Checks Answered:</span>
              <span className="font-bold text-white">{answeredChecksCount} / {checks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A5A5C0]">Accuracy Rate:</span>
              <span className="font-bold text-[#34D399]">
                {answeredChecksCount > 0
                  ? `${Math.round((correctChecksCount / answeredChecksCount) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Day 1 / Day 7 / Day 30 */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Actionable Milestones</h3>
            <p className="text-xs text-[#A5A5C0]">
              Check off tasks as you establish credentials, verify codebases, and assume strategic autonomy.
            </p>
          </div>
          <span className="text-xs text-[#A5A5C0]">
            {doneItemsCount} of {items.length} milestones finished
          </span>
        </div>

        {/* Horizon Tabs */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              {
                id: "day1" as const,
                title: "Day 1: First 24 Hours",
                desc: "Critical access, owners & initial dependencies",
                icon: Zap,
                color: "text-[#FBBF24]",
              },
              {
                id: "day7" as const,
                title: "Day 7: First Week",
                desc: "Architecture guardrails, risks & blockers",
                icon: ShieldCheck,
                color: "text-[#60A5FA]",
              },
              {
                id: "day30" as const,
                title: "Day 30: First Month",
                desc: "Decisions, autonomous ownership & strategy",
                icon: Target,
                color: "text-[#C4B5FD]",
              },
            ] as const
          ).map((tab) => {
            const count = items.filter((it) => it.horizon === tab.id).length;
            const done = items.filter((it) => it.horizon === tab.id && progress[it.id]).length;
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
                  isActive
                    ? "border-[#6366F1] bg-[#6366F1]/10 shadow-lg shadow-[#6366F1]/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={tab.color} />
                    <span className="text-xs font-bold text-white">{tab.title}</span>
                  </div>
                  <span className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-[#A5A5C0]">
                    {done}/{count}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#A5A5C0]">{tab.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Milestone Checklist */}
        <div className="mt-6 space-y-3">
          {currentTabItems.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-8 text-center text-xs text-[#A5A5C0]">
              No milestones found for this horizon.
            </div>
          ) : (
            currentTabItems.map((item) => {
              const isDone = Boolean(progress[item.id]);
              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-3.5 rounded-xl border p-4 transition ${
                    isDone
                      ? "border-[#10B981]/30 bg-[#10B981]/[0.04]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item.id, !isDone)}
                    disabled={patchingId === item.id}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition ${
                      isDone
                        ? "border-[#10B981] bg-[#10B981] text-black"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                  >
                    {isDone && <Check size={12} className="stroke-[3]" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        onClick={() => handleToggleItem(item.id, !isDone)}
                        className={`text-sm font-semibold cursor-pointer ${
                          isDone ? "text-[#A5A5C0] line-through" : "text-white"
                        }`}
                      >
                        {item.title}
                      </p>
                    </div>

                    <p className="mt-1 text-xs text-[#A5A5C0] leading-relaxed">{item.why}</p>

                    {/* Linked Claim Evidence Tags */}
                    {item.claim_ids && item.claim_ids.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {item.claim_ids.map((cid) => {
                          const linkedClaim = claimMap.get(cid);
                          return (
                            <span
                              key={cid}
                              title={linkedClaim?.statement}
                              className="inline-flex items-center gap-1 rounded-md border border-[#6366F1]/20 bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-mono text-[#C4B5FD]"
                            >
                              <FileText size={10} />
                              Claim #{cid}: {linkedClaim?.type || "verified"}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comprehension Checks Quiz Section */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#C4B5FD]" />
            <h3 className="text-lg font-bold text-white">Comprehension Checks</h3>
          </div>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Interactive verification questions derived from project technical decisions. Answers lock on first submission and directly elevate your Readiness Score.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {checks.map((chk, idx) => {
            const hasAnswered = answers[chk.id] !== undefined;
            const chosenIndex = answers[chk.id];
            const isCorrect = chosenIndex === chk.correct_index;
            const linkedClaim = claimMap.get(chk.claim_id);

            return (
              <div
                key={chk.id}
                className={`rounded-2xl border p-5 backdrop-blur-xl transition ${
                  hasAnswered
                    ? isCorrect
                      ? "border-[#10B981]/40 bg-[#10B981]/5"
                      : "border-[#F43F5E]/40 bg-[#F43F5E]/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-white leading-relaxed">
                    <span className="text-[#6366F1] mr-1.5 font-mono">Q{idx + 1}.</span>
                    {chk.question}
                  </h4>
                  {hasAnswered && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        isCorrect
                          ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                          : "bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30"
                      }`}
                    >
                      {isCorrect ? "Correct (+Points)" : "Incorrect"}
                    </span>
                  )}
                </div>

                {/* Radio Options Grid */}
                <div className="mt-4 grid gap-2.5">
                  {chk.options.map((option, optIdx) => {
                    const isOptionChosen = chosenIndex === optIdx;
                    const isOptionCorrect = chk.correct_index === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    let optionStyle = "border-white/10 bg-white/5 text-[#E2E8F0]";
                    if (hasAnswered) {
                      if (isOptionCorrect) {
                        optionStyle = "border-[#10B981]/50 bg-[#10B981]/15 text-white font-medium";
                      } else if (isOptionChosen && !isCorrect) {
                        optionStyle = "border-[#F43F5E]/50 bg-[#F43F5E]/15 text-[#FB7185]";
                      } else {
                        optionStyle = "border-white/5 bg-white/[0.01] opacity-40 text-[#A5A5C0]";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={hasAnswered || patchingId === chk.id}
                        onClick={() => handleAnswerCheck(chk.id, optIdx)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition ${optionStyle} ${
                          !hasAnswered ? "hover:border-[#6366F1] hover:bg-[#6366F1]/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black/40 font-mono text-[10px] font-bold text-[#A5A5C0]">
                            {letter}
                          </span>
                          <span>{option}</span>
                        </div>
                        {hasAnswered && isOptionCorrect && (
                          <CheckCircle2 size={16} className="shrink-0 text-[#10B981]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Evidence Source Card */}
                {hasAnswered && linkedClaim && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[#C4B5FD]">
                      <ShieldCheck size={14} />
                      <span>Verified Knowledge Evidence (Claim #{linkedClaim.id})</span>
                    </div>
                    <p className="mt-1 text-white leading-relaxed">{linkedClaim.statement}</p>
                    {linkedClaim.excerpt && (
                      <p className="mt-1 italic text-[#A5A5C0]">&ldquo;{linkedClaim.excerpt}&rdquo;</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
