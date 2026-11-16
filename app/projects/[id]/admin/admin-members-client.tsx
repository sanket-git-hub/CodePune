"use client";

import { useState, useEffect } from "react";
import {
  inviteMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "@/app/actions/projects";
import { formatRoleName } from "@/lib/roles";
import type { ProjectInvitation, ProjectMember, InvitableRole } from "@/lib/projects";
import {
  Mail,
  UserPlus,
  RefreshCw,
  Ban,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  LogOut,
  Radio,
} from "lucide-react";

type GmailStatusState = {
  loading: boolean;
  connected: boolean;
  senderEmail: string | null;
  error?: string;
  source?: string;
};

function formatDate(dateStr: string | number | Date): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}

export function AdminMembersClient({
  projectId,
  projectName,
  members,
  invitations,
}: {
  projectId: string;
  projectName: string;
  members: ProjectMember[];
  invitations: ProjectInvitation[];
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Gmail API status state
  const [gmailStatus, setGmailStatus] = useState<GmailStatusState>({
    loading: true,
    connected: false,
    senderEmail: null,
  });
  const [testSending, setTestSending] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Invite new member form states
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("incoming");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  async function fetchGmailStatus() {
    try {
      const res = await fetch("/api/email/google/status");
      if (res.ok) {
        const data = await res.json();
        setGmailStatus({
          loading: false,
          connected: Boolean(data.connected),
          senderEmail: data.senderEmail || null,
          error: data.error,
          source: data.source,
        });
      } else {
        setGmailStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setGmailStatus((prev) => ({ ...prev, loading: false }));
    }
  }

  useEffect(() => {
    fetchGmailStatus();

    // Check URL search parameters for callback status
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("gmail") === "connected") {
        setFeedback({
          type: "success",
          text: "Gmail API connected successfully! Invitation emails will now be delivered automatically from your Gmail.",
        });
        // Clean URL parameter without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("gmail");
        window.history.replaceState({}, document.title, url.toString());
      } else if (params.get("error")) {
        setFeedback({
          type: "error",
          text: decodeURIComponent(params.get("error") || "OAuth connection error"),
        });
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  async function handleSendTestEmail() {
    setTestSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/email/google/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          text: `Verification test email sent successfully to ${data.recipient}! Check your inbox.`,
        });
      } else {
        setFeedback({
          type: "error",
          text: data.error || "Failed to send test email.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error sending test email." });
    } finally {
      setTestSending(false);
    }
  }

  async function handleDisconnectGmail() {
    if (!confirm("Are you sure you want to disconnect your Gmail integration?")) {
      return;
    }
    setDisconnecting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/email/google/disconnect", { method: "POST" });
      if (res.ok) {
        setFeedback({
          type: "success",
          text: "Gmail integration disconnected.",
        });
        await fetchGmailStatus();
      } else {
        const data = await res.json();
        setFeedback({
          type: "error",
          text: data.error || "Failed to disconnect Gmail.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Error disconnecting Gmail." });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setInviteSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("email", email.trim());
    formData.append("role", role);

    try {
      const res = await inviteMemberAction(projectId, {}, formData);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else if (res.success) {
        setFeedback({
          type: "success",
          text: res.emailSent
            ? `Invitation email delivered directly to ${email}.`
            : `Invitation saved for ${email}. (Email provider not configured; copy link below).`,
        });
        setEmail("");
        setRole("incoming");
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to send invitation." });
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleResend(invitationId: string) {
    setActionLoading(`resend-${invitationId}`);
    setFeedback(null);
    const targetInv = invitations.find((i) => i.id === invitationId);
    const targetEmail = targetInv ? ` to ${targetInv.invited_email}` : "";
    try {
      const res = await resendInvitationAction(projectId, invitationId);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else if (res.success) {
        setFeedback({
          type: "success",
          text: res.emailSent
            ? `Invitation safely rotated and re-sent${targetEmail}.`
            : `Invitation token rotated${targetEmail}. Copy the fresh link.`,
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to resend invitation." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!confirm("Are you sure you want to revoke this invitation? The recipient will not be able to join using this link.")) {
      return;
    }
    setActionLoading(`revoke-${invitationId}`);
    setFeedback(null);
    try {
      const res = await revokeInvitationAction(projectId, invitationId);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({ type: "success", text: "Invitation has been revoked." });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to revoke invitation." });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#34D399]"
              : "border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#F43F5E]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SECTION 0: Gmail Integration Status Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Mail size={18} className="text-[#C4B5FD]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Email Dispatch Service</h3>
                {gmailStatus.loading ? (
                  <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-xs text-[#A5A5C0]">
                    <RefreshCw size={10} className="animate-spin" /> Checking
                  </span>
                ) : gmailStatus.connected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#34D399]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    Gmail Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                    <Radio size={10} />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#A5A5C0]">
                {gmailStatus.connected
                  ? `Sending automatically from ${gmailStatus.senderEmail || "authorized Gmail account"} to any recipient.`
                  : "Connect your Gmail account via OAuth 2.0 to send invitation emails directly to any domain without verification restrictions."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            {gmailStatus.connected ? (
              <>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testSending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <Send size={13} className={testSending ? "animate-pulse" : ""} />
                  <span>{testSending ? "Sending Test..." : "Send Test Email"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F43F5E]/20 bg-[#F43F5E]/5 px-3 py-2 text-xs font-medium text-[#F43F5E] transition hover:bg-[#F43F5E]/15 disabled:opacity-50"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <a
                href={`/api/email/google/connect?projectId=${projectId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
              >
                <Mail size={14} />
                <span>Connect Gmail</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Invite New Member Form */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <UserPlus size={20} className="text-[#C4B5FD]" />
          <h2 className="text-lg font-bold text-white">Invite Team Member</h2>
        </div>
        <p className="mt-1 text-xs text-[#A5A5C0]">
          Send an invitation link with a specific role for <strong>{projectName}</strong>. Links expire in 7 days.
        </p>

        <form onSubmit={handleInviteSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_170px_auto]">
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A5A5C0]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#6B6B88] transition focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              className="w-full rounded-xl border border-white/10 bg-[#161628] px-3 py-2.5 text-sm text-white transition focus:border-[#6366F1] focus:outline-none"
            >
              <option value="incoming">Incoming Member</option>
              <option value="reviewer">Reviewer</option>
              <option value="leaver">Knowledge Leaver</option>
              <option value="outsider">Guest / Viewer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={inviteSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-40"
          >
            {inviteSubmitting ? (
              <span>Sending...</span>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Send Invitation</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* SECTION 2: Invitations Management Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Invitations</h2>
            <p className="mt-0.5 text-xs text-[#A5A5C0]">
              Track delivery, resend links, or revoke pending invitations.
            </p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#A5A5C0]">
            {invitations.length} total
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold text-[#A5A5C0]">
                <th className="pb-3 pl-1">Recipient</th>
                <th className="pb-3">Invited Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Sent Date</th>
                <th className="pb-3">Expires</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invitations.map((inv) => {
                const isPending = inv.status === "pending";
                const isAccepted = inv.status === "accepted";
                const isRevoked = inv.status === "revoked";
                const isExpired = inv.status === "expired" || (isPending && new Date(inv.expires_at) < new Date());

                let statusBadge = (
                  <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                    Pending
                  </span>
                );
                if (isAccepted) {
                  statusBadge = (
                    <span className="rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#34D399]">
                      Accepted
                    </span>
                  );
                } else if (isRevoked) {
                  statusBadge = (
                    <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-[#A5A5C0]">
                      Revoked
                    </span>
                  );
                } else if (isExpired) {
                  statusBadge = (
                    <span className="rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2 py-0.5 text-xs font-medium text-[#F43F5E]">
                      Expired
                    </span>
                  );
                }

                return (
                  <tr key={inv.id} className="transition hover:bg-white/[0.02]">
                    <td className="py-3 pl-1 font-medium text-white">
                      {inv.invited_email}
                    </td>
                    <td className="py-3 text-[#C4B5FD]">
                      {formatRoleName(inv.invited_role)}
                    </td>
                    <td className="py-3">{statusBadge}</td>
                    <td suppressHydrationWarning className="py-3 text-xs text-[#A5A5C0]">
                      {formatDate(inv.created_at)}
                    </td>
                    <td suppressHydrationWarning className="py-3 text-xs text-[#A5A5C0]">
                      {formatDate(inv.expires_at)}
                    </td>
                    <td className="py-3 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && !isExpired && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={actionLoading === `revoke-${inv.id}`}
                            title="Revoke invitation"
                            className="rounded-lg p-1.5 text-[#A5A5C0] transition hover:bg-[#F43F5E]/15 hover:text-[#F43F5E]"
                          >
                            <Ban size={15} />
                          </button>
                        )}

                        {(isPending || isExpired) && !isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleResend(inv.id)}
                            disabled={actionLoading === `resend-${inv.id}`}
                            title="Rotate token and resend invitation"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                          >
                            <RefreshCw
                              size={12}
                              className={actionLoading === `resend-${inv.id}` ? "animate-spin" : ""}
                            />
                            <span>Resend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#A5A5C0]">
                    No invitations sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Current Project Members */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#C4B5FD]" />
            <h2 className="text-lg font-bold text-white">Active Members</h2>
          </div>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#A5A5C0]">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        <div className="mt-5 divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">{m.name || m.email}</p>
                <p className="text-xs text-[#A5A5C0]">{m.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-medium capitalize ${
                    m.role === "admin"
                      ? "border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#C4B5FD]"
                      : "border border-white/15 bg-white/5 text-[#A5A5C0]"
                  }`}
                >
                  {m.role}
                </span>
                <span suppressHydrationWarning className="text-[11px] text-[#82829E]">
                  Joined {formatDate(m.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
