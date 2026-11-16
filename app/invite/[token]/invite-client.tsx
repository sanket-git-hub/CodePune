"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvitationAction } from "@/app/actions/invitations";
import { formatRoleName } from "@/lib/roles";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldAlert,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";

type InviteClientProps = {
  rawToken: string;
  invitationData: {
    valid: boolean;
    error?: string;
    invitation?: {
      id: string;
      projectId: string;
      projectName: string;
      projectDescription: string | null;
      inviterName: string;
      invitedEmail: string;
      invitedRole: string;
      status: string;
      expiresAt: string;
    };
  };
  currentUser: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  } | null;
};

export function InviteClient({
  rawToken,
  invitationData,
  currentUser,
}: InviteClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    projectId: string;
    projectName: string;
    role: string;
    alreadyMember?: boolean;
  } | null>(null);

  // 1. Invalid or Not Found
  if (!invitationData.valid || !invitationData.invitation) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#F43F5E]/30 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F43F5E]/15 text-[#F43F5E]">
          <XCircle size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Invalid Invitation</h2>
        <p className="mt-2 text-sm text-[#A5A5C0]">
          {invitationData.error || "This invitation link is invalid or does not exist."}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const inv = invitationData.invitation;
  const roleDisplay = formatRoleName(inv.invitedRole);

  // 2. Already Expired or Revoked or Accepted
  if (inv.status !== "pending") {
    let title = "Invitation Unavailable";
    let message = "This invitation is no longer active.";

    if (inv.status === "expired") {
      title = "Invitation Expired";
      message = "This invitation link expired (invitations are valid for 7 days). Please contact the project administrator to receive a new invite.";
    } else if (inv.status === "revoked") {
      title = "Invitation Revoked";
      message = "This invitation was revoked by a project administrator.";
    } else if (inv.status === "accepted") {
      title = "Invitation Already Accepted";
      message = "This single-use invitation has already been accepted.";
    }

    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#F59E0B]/30 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B]">
          <AlertTriangle size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-[#A5A5C0]">{message}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // 3. User Not Signed In
  if (!currentUser?.email) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#C4B5FD]">
          <FolderKanban size={24} />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-white">Project Invitation</h2>
        <p className="mt-1 text-sm text-[#A5A5C0]">
          <strong className="text-white">{inv.inviterName}</strong> has invited you to join{" "}
          <strong className="text-white">{inv.projectName}</strong> as a{" "}
          <span className="font-semibold text-[#C4B5FD]">{roleDisplay}</span>.
        </p>

        {inv.projectDescription && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-[#A5A5C0]">
            <p className="font-medium text-white">About the project:</p>
            <p className="mt-1">{inv.projectDescription}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-4 text-xs text-[#C4B5FD]">
          <p className="font-semibold text-white">Security Verification</p>
          <p className="mt-0.5">
            This invitation was reserved specifically for: <strong>{inv.invitedEmail}</strong>.
            Please sign in or register with this email to claim your access.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/login?callbackUrl=/invite/${rawToken}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
          >
            <LogIn size={16} />
            <span>Sign In to Accept</span>
          </Link>
          <Link
            href={`/register?callbackUrl=/invite/${rawToken}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authenticated, but Email Mismatch Check
  const normAuthEmail = currentUser.email.trim().toLowerCase();
  const normInvitedEmail = inv.invitedEmail.trim().toLowerCase();
  const isEmailMatch = normAuthEmail === normInvitedEmail;

  if (!isEmailMatch) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#F43F5E]/30 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F43F5E]/15 text-[#F43F5E]">
          <ShieldAlert size={26} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-white">Email Address Mismatch</h2>
        <p className="mt-2 text-sm text-[#A5A5C0]">
          This invitation was securely created for{" "}
          <strong className="text-white">{normInvitedEmail}</strong>, but you are currently signed in as{" "}
          <strong className="text-[#F43F5E]">{normAuthEmail}</strong>.
        </p>

        <p className="mt-3 text-xs text-[#82829E]">
          To protect project privacy and prevent unauthorized access, invitations can only be accepted by the recipient email address.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
          >
            <LogOut size={16} />
            <span>Switch to {normInvitedEmail}</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-[#A5A5C0] hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </div>
    );
  }

  // 5. Accepted Success State
  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#10B981]/30 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#34D399]">
          <CheckCircle2 size={32} />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-white">
          {success.alreadyMember ? "Already a Member!" : "Welcome to the Team!"}
        </h2>
        <p className="mt-2 text-sm text-[#A5A5C0]">
          You are now registered as a{" "}
          <strong className="text-white">{formatRoleName(success.role)}</strong> in{" "}
          <strong className="text-white">{success.projectName}</strong>.
        </p>

        <button
          type="button"
          onClick={() => router.push(`/projects/${success.projectId}`)}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
        >
          <span>Open Project Workspace</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // 6. Ready to Accept State
  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await acceptInvitationAction(rawToken);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      if (res.success && res.projectId) {
        setSuccess({
          projectId: res.projectId,
          projectName: res.projectName || inv.projectName,
          role: res.role || inv.invitedRole,
          alreadyMember: res.alreadyMember,
        });
      }
    } catch {
      setError("An unexpected error occurred while accepting the invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#C4B5FD]">
        <FolderKanban size={24} />
      </div>

      <h2 className="mt-4 text-2xl font-bold text-white">Accept Invitation</h2>
      <p className="mt-1 text-sm text-[#A5A5C0]">
        You have been invited by <strong className="text-white">{inv.inviterName}</strong> to join:
      </p>

      {/* Project Card */}
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{inv.projectName}</h3>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              {inv.projectDescription || "Engineering and handover workspace"}
            </p>
          </div>
          <span className="rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-semibold text-[#C4B5FD]">
            {roleDisplay}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-[#A5A5C0]">
          <span>Accepting as:</span>
          <span className="font-medium text-white">{normAuthEmail}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3.5 text-xs text-[#F43F5E]">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={loading}
          onClick={handleAccept}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-40"
        >
          {loading ? (
            <span>Joining Project...</span>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>Accept Invitation & Join</span>
            </>
          )}
        </button>

        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-[#A5A5C0] hover:text-white"
        >
          Decline / Later
        </Link>
      </div>
    </div>
  );
}
