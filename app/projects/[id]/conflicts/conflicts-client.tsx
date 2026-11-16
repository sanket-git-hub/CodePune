"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitCompare,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  FileText,
  Calendar,
} from "lucide-react";

export interface ConflictItem {
  id: string;
  project_id: string;
  kind: "contradiction" | "stale";
  reason: string;
  detected_by: "rule" | "gemini";
  status: "open" | "resolved" | "dismissed";
  resolution?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  is_planted: boolean;
  created_at: string;
  claim_a_id: string;
  claim_a_statement: string;
  claim_a_excerpt?: string | null;
  claim_a_type: string;
  claim_a_created_at: string;
  claim_a_source_title?: string | null;
  claim_b_id?: string | null;
  claim_b_statement?: string | null;
  claim_b_excerpt?: string | null;
  claim_b_type?: string | null;
  claim_b_created_at?: string | null;
  claim_b_source_title?: string | null;
  resolver_name?: string | null;
}

interface ConflictsClientProps {
  projectId: string;
  projectName: string;
  initialConflicts: ConflictItem[];
  userRole: string;
}

export function ConflictsClient({
  projectId,
  projectName,
  initialConflicts,
  userRole,
}: ConflictsClientProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>(initialConflicts);
  const [detecting, setDetecting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);

  const isStaff = userRole === "admin" || userRole === "reviewer";

  const contradictions = conflicts.filter((c) => c.kind === "contradiction" && c.status === "open");
  const staleItems = conflicts.filter((c) => c.kind === "stale" && c.status === "open");
  const resolvedItems = conflicts.filter((c) => c.status !== "open");

  // Run Conflict & Stale Detection
  const handleDetect = async () => {
    setDetecting(true);
    setSummaryNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/conflicts/detect`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to run detection");
      }

      setSummaryNotice(
        `Detection finished: Found ${data.contradictionsCount} contradictions (${data.detectedByRule} rule, ${data.detectedByGemini} Gemini) and ${data.staleCount} stale work items.`
      );

      // Refresh conflicts list
      const listRes = await fetch(`/api/projects/${projectId}/conflicts?status=all`);
      const listData = await listRes.json();
      if (listRes.ok && listData.conflicts) {
        setConflicts(listData.conflicts);
      }
    } catch (err: unknown) {
      setSummaryNotice(err instanceof Error ? err.message : "Error executing detection");
    } finally {
      setDetecting(false);
    }
  };

  // Resolve Conflict
  const handleResolve = async (
    conflictId: string,
    resolution: "keep_a" | "keep_b" | "both_valid" | "dismiss",
    note?: string
  ) => {
    setResolvingId(conflictId);
    try {
      const res = await fetch(`/api/projects/${projectId}/conflicts/${conflictId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve conflict");
      }

      // Update local state
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: resolution === "dismiss" ? "dismissed" : "resolved",
                resolution,
              }
            : c
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error resolving conflict");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Conflict &amp; Stale-Work Intelligence</h2>
          <p className="text-xs text-[#A5A5C0]">
            Automated discovery of contradictory technical claims and unupdated ongoing tasks.
          </p>
        </div>

        {isStaff && (
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-xs font-semibold text-white shadow-lg shadow-[#6366F1]/20 transition hover:opacity-95 disabled:opacity-50"
          >
            {detecting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Run Conflict &amp; Stale Check</span>
          </button>
        )}
      </div>

      {summaryNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-3.5 text-xs text-[#C4B5FD]">
          <Sparkles size={14} className="shrink-0" />
          <span>{summaryNotice}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4">
          <p className="text-xs uppercase font-semibold tracking-wider text-[#FB7185]">Open Contradictions</p>
          <p className="mt-1 text-3xl font-extrabold text-white">{contradictions.length}</p>
          <p className="mt-1 text-xs text-[#FB7185]/80">Opposing or reversed statements</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs uppercase font-semibold tracking-wider text-amber-300">Stale Tasks (&gt;14d)</p>
          <p className="mt-1 text-3xl font-extrabold text-white">{staleItems.length}</p>
          <p className="mt-1 text-xs text-amber-200/80">In-progress work with no updates</p>
        </div>

        <div className="rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 p-4">
          <p className="text-xs uppercase font-semibold tracking-wider text-[#34D399]">Resolved / Dismissed</p>
          <p className="mt-1 text-3xl font-extrabold text-white">{resolvedItems.length}</p>
          <p className="mt-1 text-xs text-[#34D399]/80">Decisions kept or archived</p>
        </div>
      </div>

      {/* Empty State */}
      {conflicts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <GitCompare size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No conflicts found</h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            Your project's verified decisions and next actions are currently synchronized. Run the check to scan for stale milestones or contradicting architecture choices.
          </p>
          {isStaff && (
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:opacity-50"
            >
              <Sparkles size={16} />
              Run Conflict &amp; Stale Check
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Contradictions */}
          {contradictions.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div>
                <h3 className="text-base font-bold text-white">Direct Contradictions &amp; Reversals</h3>
                <p className="text-xs text-[#A5A5C0]">
                  Pairs of claims that present opposing facts, deprecations, or reversed architectural directions.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                {contradictions.map((c) => {
                  const isBusy = resolvingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/5 p-5 transition hover:border-[#F43F5E]/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#F43F5E]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FB7185]">
                            Contradiction
                          </span>
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-[#C4B5FD]">
                            Detected by {c.detected_by}
                          </span>
                        </div>
                        <p className="text-xs text-[#FB7185] font-medium">{c.reason}</p>
                      </div>

                      {/* Side by Side Comparison */}
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {/* Claim A */}
                        <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-4 text-xs">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-semibold text-white">Claim A (#{c.claim_a_id})</span>
                            <span className="text-[10px] text-[#A5A5C0] font-mono">{c.claim_a_type}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-white">{c.claim_a_statement}</p>
                          {c.claim_a_excerpt && (
                            <p className="mt-1 italic text-[#A5A5C0]">&ldquo;{c.claim_a_excerpt}&rdquo;</p>
                          )}
                          <p className="mt-2 text-[10px] text-[#C4B5FD]">Source: {c.claim_a_source_title || "Unknown"}</p>
                        </div>

                        {/* Claim B */}
                        <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-4 text-xs">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-semibold text-white">Claim B (#{c.claim_b_id})</span>
                            <span className="text-[10px] text-[#A5A5C0] font-mono">{c.claim_b_type}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-white">{c.claim_b_statement}</p>
                          {c.claim_b_excerpt && (
                            <p className="mt-1 italic text-[#A5A5C0]">&ldquo;{c.claim_b_excerpt}&rdquo;</p>
                          )}
                          <p className="mt-2 text-[10px] text-[#C4B5FD]">Source: {c.claim_b_source_title || "Unknown"}</p>
                        </div>
                      </div>

                      {/* Resolution Actions */}
                      {isStaff && (
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
                          <span className="mr-2 text-xs text-[#A5A5C0]">Resolve contradiction:</span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "keep_a", "Kept Claim A as truth; Claim B rejected.")}
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                          >
                            Keep A (Reject B)
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "keep_b", "Kept Claim B as truth; Claim A rejected.")}
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                          >
                            Keep B (Reject A)
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "both_valid", "Both claims recognized as valid in context.")}
                            className="rounded-lg border border-[#34D399]/40 bg-[#34D399]/10 px-3 py-1.5 text-xs font-semibold text-[#34D399] hover:bg-[#34D399]/20 disabled:opacity-50"
                          >
                            Both Valid
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "dismiss", "Dismissed without claim changes.")}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#A5A5C0] hover:text-white disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Stale Work Items */}
          {staleItems.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div>
                <h3 className="text-base font-bold text-white">Stale In-Progress Tasks (&gt;14 Days)</h3>
                <p className="text-xs text-[#A5A5C0]">
                  Next actions and blockers marked as in-progress or WIP with zero activity for over two weeks.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {staleItems.map((c) => {
                  const isBusy = resolvingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-[#12121F] p-4 text-xs"
                    >
                      <div className="flex-1 min-w-[280px]">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                            Stale
                          </span>
                          <span className="font-semibold text-white">Claim #{c.claim_a_id}</span>
                          <span className="text-[#A5A5C0]">({c.claim_a_type})</span>
                        </div>
                        <p className="mt-1 text-sm text-white font-medium">{c.claim_a_statement}</p>
                        <p className="mt-1 text-amber-300/80 font-mono text-[11px]">{c.reason}</p>
                      </div>

                      {isStaff && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "keep_a", "Verified still active.")}
                            className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5558E6] disabled:opacity-50"
                          >
                            Mark Active
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResolve(c.id, "dismiss", "Dismissed stale flag.")}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#A5A5C0] hover:text-white disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
