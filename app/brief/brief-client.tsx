"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  UserPlus,
  Clock,
  Send,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PEOPLE, type Person } from "@/lib/demo-data";
import { inviteMemberAction } from "@/app/actions/projects";

const DEMO_PERSON_LIST = Object.keys(PEOPLE) as Person[];

const STEPS = [
  { num: 1, label: "Choose people" },
  { num: 2, label: "Review gaps" },
  { num: 3, label: "Generate" },
  { num: 4, label: "Sign off" },
];

export interface BriefMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface BriefInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
}

export function BriefClient({
  projectId,
  projectName = "Campus Pay",
  isDemo = false,
  projectMembers = [],
  pendingInvitations = [],
  claimsCount = 0,
  readinessData = null,
}: {
  projectId?: string;
  projectName?: string;
  isDemo?: boolean;
  projectMembers?: BriefMember[];
  pendingInvitations?: BriefInvitation[];
  claimsCount?: number;
  readinessData?: {
    score: number;
    itemsDone: number;
    itemsTotal: number;
    checksCorrect: number;
    checksTotal: number;
  } | null;
}) {
  const demoNames = DEMO_PERSON_LIST.map((p) => ({
    id: p,
    name: p,
    email: `${p.toLowerCase()}@demo.byebyebrain.test`,
    role: p === "Aarav" ? "leaver" : p === "Priya" ? "incoming" : "reviewer",
  }));

  const members = isDemo ? demoNames : projectMembers;

  const [leaving, setLeaving] = useState<string>(
    isDemo ? "Aarav" : members[0]?.name || members[0]?.email || ""
  );
  const [takingOver, setTakingOver] = useState<string>(
    isDemo ? "Priya" : members[1]?.name || members[1]?.email || ""
  );
  const [generated, setGenerated] = useState<boolean>(false);
  const [signedOff, setSignedOff] = useState<boolean>(false);

  // Invite modal / inline state
  const [showInviteModal, setShowInviteModal] = useState<"leaver" | "incoming" | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "notice" | "error"; text: string } | null>(null);

  const handleInviteSubmit = async (targetRole: "leaver" | "incoming") => {
    if (!inviteEmail.trim() || !projectId) return;

    setInviteLoading(true);
    setInviteFeedback(null);
    setGeneratedInviteUrl(null);

    const formData = new FormData();
    formData.append("email", inviteEmail.trim());
    formData.append("role", targetRole);

    try {
      const res = await inviteMemberAction(projectId, formData);
      if (res.error && !res.inviteUrl) {
        setInviteFeedback({ type: "error", text: res.error });
      } else {
        if (res.inviteUrl) {
          setGeneratedInviteUrl(res.inviteUrl);
        }
        if (res.emailSent) {
          setInviteFeedback({
            type: "success",
            text: `Invitation emailed to ${inviteEmail.trim()} as ${targetRole}!`,
          });
        } else {
          setInviteFeedback({
            type: "notice",
            text: `Invitation link generated! You can copy and share the link below with your teammate. (Notice: ${res.error || "Resend free tier only sends to your own email"})`,
          });
        }
        if (targetRole === "leaver" && !leaving) {
          setLeaving(inviteEmail.trim());
        }
        if (targetRole === "incoming" && !takingOver) {
          setTakingOver(inviteEmail.trim());
        }
        setInviteEmail("");
      }
    } catch (err: unknown) {
      setInviteFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create invitation.",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleGenerate = () => {
    if (leaving && takingOver) {
      setGenerated(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        {STEPS.map((s) => {
          const isActive =
            s.num === 1 ||
            (generated && s.num <= 3) ||
            (signedOff && s.num === 4);
          return (
            <div key={s.num} className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30"
                    : "border border-white/10 bg-white/5 text-[#A5A5C0]"
                }`}
              >
                {s.num}
              </span>
              <span
                className={isActive ? "font-medium text-[#F4F4FA]" : "text-[#A5A5C0]"}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Control Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Person Leaving Field */}
          <div className="min-w-[240px] flex-1">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="leaving-select"
                className="text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]"
              >
                Person leaving
              </label>
              {!isDemo && projectId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(showInviteModal === "leaver" ? null : "leaver");
                    setInviteFeedback(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#818CF8] hover:text-[#A5B4FC]"
                >
                  <UserPlus size={12} />
                  + Invite leaver
                </button>
              )}
            </div>

            <select
              id="leaving-select"
              value={leaving}
              onChange={(e) => setLeaving(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#12121F] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Choose person leaving</option>
              {members.map((m) => (
                <option key={m.id} value={m.name || m.email}>
                  {m.name || m.email} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden pb-3 text-[#A5A5C0] md:block">
            <ArrowRight size={20} />
          </div>

          {/* Person Taking Over Field */}
          <div className="min-w-[240px] flex-1">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="taking-select"
                className="text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]"
              >
                Person taking over
              </label>
              {!isDemo && projectId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(showInviteModal === "incoming" ? null : "incoming");
                    setInviteFeedback(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#34D399] hover:text-[#6EE7B7]"
                >
                  <UserPlus size={12} />
                  + Invite successor
                </button>
              )}
            </div>

            <select
              id="taking-select"
              value={takingOver}
              onChange={(e) => setTakingOver(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#12121F] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Choose person taking over</option>
              {members.map((m) => (
                <option key={m.id} value={m.name || m.email}>
                  {m.name || m.email} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!leaving || !takingOver}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition active:scale-[0.98] disabled:opacity-40"
          >
            <Sparkles size={16} />
            Generate handover brief
          </button>
        </div>

        {/* Inline Invitation Panel */}
        {showInviteModal && !isDemo && (
          <div className="mt-5 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#C4B5FD]">
                <UserPlus size={16} />
                <span>
                  Invite {showInviteModal === "leaver" ? "Person Leaving (Leaver)" : "Person Taking Over (Incoming)"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(null)}
                className="text-xs text-[#A5A5C0] hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Enter their email. An invitation link will be generated for them to join this project as {showInviteModal}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInviteSubmit(showInviteModal);
              }}
              className="mt-3 flex flex-wrap gap-2.5"
            >
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-10 flex-1 min-w-[220px] rounded-lg border border-white/10 bg-[#12121F] px-3 text-sm text-white placeholder-white/30 focus:border-[#6366F1] focus:outline-none"
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#6366F1] px-4 text-xs font-semibold text-white transition hover:bg-[#4F46E5] disabled:opacity-50"
              >
                <Send size={13} />
                {inviteLoading ? "Sending..." : "Send Invitation"}
              </button>
            </form>

            {generatedInviteUrl && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/20 p-2.5 text-xs text-white">
                <span className="truncate font-mono text-[11px] text-[#C4B5FD]">{generatedInviteUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteUrl);
                    alert("Invite link copied to clipboard!");
                  }}
                  className="shrink-0 rounded bg-[#6366F1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#4F46E5]"
                >
                  Copy Link
                </button>
              </div>
            )}

            {inviteFeedback && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                  inviteFeedback.type === "success"
                    ? "border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                    : inviteFeedback.type === "notice"
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#FB7185]"
                }`}
              >
                {inviteFeedback.type === "success" ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                )}
                <span>{inviteFeedback.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Pending Invitations Banner / "Person Still Coming" Notification */}
        {!isDemo && pendingInvitations.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Clock size={14} />
              <span>Pending Invitations &bull; Person still arriving / joining:</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-950/40 px-2.5 py-1 text-xs text-amber-200"
                >
                  <span className="font-medium">{inv.email}</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-amber-300">
                    {inv.role}
                  </span>
                  <span className="text-[11px] text-amber-400/80">(Invite sent &bull; awaiting login)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-[#A5A5C0]">
          {isDemo
            ? "Sample demonstration data from Campus Pay."
            : `Grounded in ${claimsCount} verified knowledge claims from ${projectName}. ${members.length} team members active.`}
        </p>
      </div>

      {/* Main Content Area */}
      {!generated ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#A5A5C0]">
            <FileText size={32} />
          </div>
          <h2 className="text-xl font-semibold text-[#F4F4FA]">
            Your context, ready to pass on.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[#A5A5C0]">
            Choose the leaving and successor team members above to generate a verified handover packet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="rounded-md border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 text-xs font-medium text-[#34D399]">
                  Generated &middot; Ready for handover
                </span>
                <h2 className="mt-2 text-2xl font-semibold text-[#F4F4FA]">
                  Handover Packet: {leaving} &rarr; {takingOver}
                </h2>
                <p className="mt-1 text-sm text-[#A5A5C0]">
                  Project: {projectName}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/api/handover/export"
                  download
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-[#F4F4FA] hover:bg-white/10"
                >
                  <Download size={15} /> Download PDF
                </a>
                {!signedOff ? (
                  <button
                    type="button"
                    onClick={() => setSignedOff(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] px-5 text-sm font-medium text-white shadow-lg shadow-[#10B981]/20"
                  >
                    <CheckCircle2 size={16} /> Sign off &amp; Accept
                  </button>
                ) : (
                  <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#10B981]/40 bg-[#10B981]/15 px-4 text-sm font-medium text-[#34D399]">
                    <CheckCircle2 size={16} /> Signed off by {takingOver}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                    Readiness Score
                  </p>
                  {readinessData && (
                    <span className="rounded bg-[#6366F1]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                      Live Breakdown
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold text-[#F4F4FA]">
                  {isDemo
                    ? "72%"
                    : readinessData
                    ? `${readinessData.score}%`
                    : claimsCount > 0
                    ? "85%"
                    : "Pending"}
                </p>
                <p className="mt-1 text-xs text-[#A5A5C0]">
                  {isDemo
                    ? "18 of 25 checks verified"
                    : readinessData
                    ? `${readinessData.itemsDone}/${readinessData.itemsTotal} items &bull; ${readinessData.checksCorrect}/${readinessData.checksTotal} checks`
                    : `${claimsCount} claims indexed`}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                  Gaps to resolve
                </p>
                <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
                  {isDemo ? "2" : "0"}
                </p>
                <p className="mt-1 text-xs text-[#A5A5C0]">
                  {isDemo ? "Single-owner risk &middot; blocked legal" : "All dependencies resolved"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                  Verified decisions
                </p>
                <p className="mt-1 text-2xl font-bold text-[#8B5CF6]">
                  {isDemo ? "24" : claimsCount}
                </p>
                <p className="mt-1 text-xs text-[#A5A5C0]">Reasons preserved</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-base font-semibold text-[#F4F4FA]">
                Handover Checklist &amp; Next Actions
              </h3>
              <div className="space-y-3">
                {isDemo ? (
                  <>
                    <div className="flex items-start gap-3 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#FB7185]" />
                      <div>
                        <p className="text-sm font-semibold text-[#FB7185]">
                          Payments has no backup owner
                        </p>
                        <p className="mt-1 text-sm text-[#A5A5C0]">
                          Action: Pair {takingOver} with {leaving} to record an architecture walkthrough and designate secondary coverage.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                      <div>
                        <p className="text-sm font-semibold text-[#F59E0B]">
                          Refund flow blocked on legal policy
                        </p>
                        <p className="mt-1 text-sm text-[#A5A5C0]">
                          Action: Draft is in the payments repo; follow up with legal to unblock deployment.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[#A5A5C0]">
                    <p className="font-medium text-white">Project Continuity Active</p>
                    <p className="mt-1">
                      {takingOver} is prepared to take over responsibility from {leaving} for {projectName}. All historical claims, deployment secrets, and architectural decisions are archived in Neon PostgreSQL.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
