"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  EyeOff,
  Sparkles,
  Loader2,
  FileText,
  UserCheck,
  Send,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  Compass,
  Layers,
  ChevronDown,
  UserX,
  FileQuestion,
  Info,
} from "lucide-react";

export interface KnowledgeGapItem {
  id: string;
  project_id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved" | "ignored";
  gap_type: "decision_no_reason" | "action_no_owner" | "leaver_only";
  question: string;
  answer?: string | null;
  related_claim_id?: string | null;
  related_source_id?: string | null;
  answered_claim_id?: string | null;
  answered_at?: string | null;
  created_at: string;
  related_claim_statement?: string | null;
  related_claim_type?: string | null;
  related_source_title?: string | null;
  answered_claim_statement?: string | null;
  answered_claim_review_state?: string | null;
}

interface GapsClientProps {
  projectId: string;
  projectName: string;
  initialGaps: KnowledgeGapItem[];
  userRole: string;
}

export function GapsClient({
  projectId,
  projectName,
  initialGaps,
  userRole,
}: GapsClientProps) {
  const [gaps, setGaps] = useState<KnowledgeGapItem[]>(initialGaps);
  const [detecting, setDetecting] = useState(false);
  const [detectNotice, setDetectNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; text: string; newClaimId?: string }>>({});
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved" | "ignored">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "decision_no_reason" | "action_no_owner" | "leaver_only">("all");

  const isStaff = userRole === "admin" || userRole === "reviewer";
  const isLeaver = userRole === "leaver" || userRole === "admin";

  // Counts
  const openCount = gaps.filter((g) => g.status === "open" || g.status === "in_progress").length;
  const resolvedCount = gaps.filter((g) => g.status === "resolved").length;
  const ignoredCount = gaps.filter((g) => g.status === "ignored").length;

  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      if (statusFilter === "open" && g.status !== "open" && g.status !== "in_progress") return false;
      if (statusFilter === "resolved" && g.status !== "resolved") return false;
      if (statusFilter === "ignored" && g.status !== "ignored") return false;
      if (typeFilter !== "all" && g.gap_type !== typeFilter) return false;
      return true;
    });
  }, [gaps, statusFilter, typeFilter]);

  // Run Gap Finder
  const handleDetect = async () => {
    setDetecting(true);
    setDetectNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/gaps/detect`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to run gap finder");
      }

      setDetectNotice(
        `Discovered ${data.result.totalNew} new gaps (${data.result.decisionNoReason} unreasoned decisions, ${data.result.actionNoOwner} unassigned tasks, ${data.result.leaverOnly} single-contributor sources).`
      );

      // Refresh list
      const listRes = await fetch(`/api/projects/${projectId}/gaps`);
      const listData = await listRes.json();
      if (listRes.ok && listData.gaps) {
        setGaps(listData.gaps);
      }
    } catch (err: unknown) {
      setDetectNotice(err instanceof Error ? err.message : "Error executing gap detection");
    } finally {
      setDetecting(false);
    }
  };

  // Submit Answer (Leaver)
  const handleSubmitAnswer = async (gapId: string) => {
    const text = (answers[gapId] || "").trim();
    if (text.length < 10) {
      setFeedback((prev) => ({
        ...prev,
        [gapId]: { type: "error", text: "Answer must be at least 10 characters long." },
      }));
      return;
    }

    setSubmittingId(gapId);
    setFeedback((prev) => ({ ...prev, [gapId]: undefined as any }));

    try {
      const res = await fetch(`/api/projects/${projectId}/gaps/${gapId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }

      setFeedback((prev) => ({
        ...prev,
        [gapId]: {
          type: "success",
          text: "Verified & stored! A new draft claim has been generated for reviewer sign-off.",
          newClaimId: data.answeredClaim?.id,
        },
      }));

      // Update local item
      setGaps((prev) =>
        prev.map((g) =>
          g.id === gapId
            ? {
                ...g,
                status: "resolved",
                answer: text,
                answered_claim_id: data.answeredClaim?.id,
                answered_claim_statement: data.answeredClaim?.statement,
                answered_claim_review_state: "draft",
              }
            : g
        )
      );
    } catch (err: unknown) {
      setFeedback((prev) => ({
        ...prev,
        [gapId]: {
          type: "error",
          text: err instanceof Error ? err.message : "Submission failed",
        },
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  // Ignore Gap (Staff)
  const handleIgnore = async (gapId: string) => {
    if (!confirm("Dismiss this gap? It will be marked as ignored.")) return;
    setIgnoringId(gapId);
    try {
      const res = await fetch(`/api/projects/${projectId}/gaps/${gapId}/ignore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to ignore gap");
      }

      setGaps((prev) =>
        prev.map((g) => (g.id === gapId ? { ...g, status: "ignored" } : g))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to ignore gap");
    } finally {
      setIgnoringId(null);
    }
  };

  const getGapTypeBadge = (type: string) => {
    switch (type) {
      case "decision_no_reason":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-0.5 text-xs font-semibold text-[#C4B5FD]">
            <FileQuestion size={12} />
            Decision Missing Reason
          </span>
        );
      case "action_no_owner":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FBBF24]">
            <UserX size={12} />
            Unassigned Next Action
          </span>
        );
      case "leaver_only":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FB7185]">
            <ShieldAlert size={12} />
            Single-Contributor Source
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-[#A5A5C0]">
            Knowledge Gap
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Action Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#6366F1] animate-ping" />
            <h2 className="text-xl font-bold text-white tracking-tight">Continuity Gap Engine</h2>
          </div>
          <p className="mt-1 text-xs text-[#A5A5C0] leading-relaxed">
            Scans technical decisions without rationale, orphaned tasks lacking an active owner, and siloed sources authored solely by the departing engineer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetect}
          disabled={detecting}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-xs font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-50"
        >
          {detecting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Scanning Project...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Run Gap Finder</span>
            </>
          )}
        </button>
      </div>

      {detectNotice && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-4 text-xs font-medium text-[#C4B5FD]">
          <Sparkles size={16} className="shrink-0 text-[#8B5CF6]" />
          <span>{detectNotice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5C0]">Total Identified</p>
          <p className="mt-1.5 text-3xl font-extrabold text-white">{gaps.length}</p>
          <p className="mt-1 text-[11px] text-[#6B6B88]">All detected continuity points</p>
        </div>

        <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FBBF24]">Open &amp; Pending</p>
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          </div>
          <p className="mt-1.5 text-3xl font-extrabold text-white">{openCount}</p>
          <p className="mt-1 text-[11px] text-[#FBBF24]/70">Requiring leaver answers</p>
        </div>

        <div className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/5 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">Answered &amp; Verified</p>
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
          </div>
          <p className="mt-1.5 text-3xl font-extrabold text-white">{resolvedCount}</p>
          <p className="mt-1 text-[11px] text-[#34D399]/70">Converted into draft claims</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5C0]">Dismissed</p>
          <p className="mt-1.5 text-3xl font-extrabold text-white">{ignoredCount}</p>
          <p className="mt-1 text-[11px] text-[#6B6B88]">Marked low-risk by reviewer</p>
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === "all"
                ? "bg-white text-black font-semibold shadow"
                : "text-[#A5A5C0] hover:text-white hover:bg-white/5"
            }`}
          >
            All Gaps ({gaps.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("open")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === "open"
                ? "bg-[#F59E0B] text-black font-semibold shadow"
                : "text-[#A5A5C0] hover:text-white hover:bg-white/5"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === "resolved"
                ? "bg-[#10B981] text-black font-semibold shadow"
                : "text-[#A5A5C0] hover:text-white hover:bg-white/5"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ignored")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === "ignored"
                ? "bg-white/20 text-white font-semibold shadow"
                : "text-[#A5A5C0] hover:text-white hover:bg-white/5"
            }`}
          >
            Ignored ({ignoredCount})
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#A5A5C0]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-[#161628] px-3 py-1.5 text-xs text-white focus:border-[#6366F1] focus:outline-none"
          >
            <option value="all">All Gap Categories</option>
            <option value="decision_no_reason">Decisions Missing Reason</option>
            <option value="action_no_owner">Unassigned Next Actions</option>
            <option value="leaver_only">Single-Contributor Sources</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {filteredGaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <HelpCircle size={28} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">No gaps match your filter</h3>
          <p className="mt-1 max-w-sm text-xs text-[#A5A5C0]">
            Try changing the filter or click below to run detection against the project claims.
          </p>
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-[#6366F1] px-4 text-xs font-semibold text-white transition hover:bg-[#4F46E5] disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>Scan Project Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGaps.map((gap) => {
            const isResolved = gap.status === "resolved";
            const isIgnored = gap.status === "ignored";
            const currentAnswer = answers[gap.id] || "";
            const fb = feedback[gap.id];

            return (
              <div
                key={gap.id}
                className={`group rounded-2xl border p-6 backdrop-blur-xl transition ${
                  isResolved
                    ? "border-[#10B981]/30 bg-[#10B981]/[0.03]"
                    : isIgnored
                    ? "border-white/5 bg-white/[0.01] opacity-50"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getGapTypeBadge(gap.gap_type)}
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        gap.severity === "high" || gap.severity === "critical"
                          ? "bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/30"
                          : "bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/30"
                      }`}
                    >
                      {gap.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-2.5 py-1 text-xs font-semibold text-[#34D399]">
                        <CheckCircle2 size={13} />
                        Resolved
                      </span>
                    ) : isIgnored ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#A5A5C0]">
                        <EyeOff size={13} />
                        Ignored
                      </span>
                    ) : (
                      isStaff && (
                        <button
                          type="button"
                          disabled={ignoringId === gap.id}
                          onClick={() => handleIgnore(gap.id)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#A5A5C0] transition hover:bg-white/10 hover:text-white"
                        >
                          {ignoringId === gap.id ? "Dismissing..." : "Dismiss"}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="mt-3 text-base font-bold text-white">{gap.title}</h3>

                {/* Context Evidence Snippet */}
                {gap.related_claim_statement && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-black/40 p-3.5 text-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5C0]">
                      Associated Claim:
                    </span>
                    <p className="mt-1 text-white italic">&ldquo;{gap.related_claim_statement}&rdquo;</p>
                  </div>
                )}

                {gap.related_source_title && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-black/40 p-3 text-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5C0]">
                      Source Document:
                    </span>
                    <p className="mt-0.5 text-white font-medium">{gap.related_source_title}</p>
                  </div>
                )}

                {/* Question Callout */}
                <div className="mt-4 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-4">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle size={16} className="shrink-0 text-[#C4B5FD] mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#C4B5FD] uppercase tracking-wider">
                        Leaver Question Flow
                      </p>
                      <p className="mt-1 text-sm text-white font-medium">{gap.question}</p>
                    </div>
                  </div>
                </div>

                {/* Resolved Answer View */}
                {isResolved ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5C0]">
                        Recorded Leaver Answer:
                      </p>
                      <p className="mt-1.5 text-white leading-relaxed text-sm">{gap.answer}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#34D399]">
                        <CheckCircle2 size={14} />
                        Synthesized into new continuity claim
                      </span>

                      {gap.answered_claim_id && (
                        <Link
                          href={`/decisions`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1.5 text-xs font-semibold text-[#C4B5FD] transition hover:bg-[#6366F1]/20"
                        >
                          <span>Review Draft Claim #{gap.answered_claim_id}</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                ) : !isIgnored && isLeaver ? (
                  /* Answer Input for Leaver / Admin */
                  <div className="mt-4 space-y-3">
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Provide the rationale, trade-offs, owner identity, or knowledge context (min 10 characters)..."
                        value={currentAnswer}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [gap.id]: e.target.value }))
                        }
                        disabled={submittingId === gap.id}
                        className="w-full rounded-xl border border-white/10 bg-[#0B0B14] p-3.5 text-sm text-white placeholder-[#6B6B88] transition focus:border-[#6366F1] focus:outline-none"
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#A5A5C0]">
                        <span>Sensitive data and tokens are automatically shielded.</span>
                        <span className={currentAnswer.length >= 10 ? "text-[#34D399]" : "text-[#A5A5C0]"}>
                          {currentAnswer.length} / 2000 chars
                        </span>
                      </div>
                    </div>

                    {fb && (
                      <div
                        className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                          fb.type === "success"
                            ? "border border-[#10B981]/30 bg-[#10B981]/10 text-[#34D399]"
                            : "border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#FB7185]"
                        }`}
                      >
                        {fb.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>{fb.text}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={submittingId === gap.id || currentAnswer.trim().length < 10}
                        onClick={() => handleSubmitAnswer(gap.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-xs font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-40"
                      >
                        {submittingId === gap.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Verifying &amp; Generating Claim...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Submit Resolution</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
