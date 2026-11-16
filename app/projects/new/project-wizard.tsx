"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectAction } from "@/app/actions/projects";
import {
  FolderKanban,
  UserPlus,
  Plus,
  Trash2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { InvitableRole } from "@/lib/projects";

type InviteItem = {
  email: string;
  role: InvitableRole;
};

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [invitations, setInvitations] = useState<InviteItem[]>([]);

  // Input states for current invite addition
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<InvitableRole>("incoming");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Submission states
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    projectId: string;
    summary?: {
      totalInvited: number;
      sentCount: number;
      failedCount: number;
      emailConfigured: boolean;
    };
    invitations?: Array<{
      email: string;
      role: InvitableRole;
      inviteUrl: string;
      emailSent: boolean;
      error?: string;
    }>;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  function handleAddInvite() {
    setInviteError(null);
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      setInviteError("Please enter an email address.");
      return;
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    if (invitations.some((i) => i.email === trimmed)) {
      setInviteError("This email has already been added.");
      return;
    }

    setInvitations([...invitations, { email: trimmed, role: roleInput }]);
    setEmailInput("");
    setRoleInput("incoming");
  }

  function handleRemoveInvite(index: number) {
    setInvitations(invitations.filter((_, i) => i !== index));
  }

  async function handleSubmit(includeInvites: boolean) {
    if (!name.trim()) {
      setGeneralError("Project name is required.");
      return;
    }

    setLoading(true);
    setGeneralError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append(
      "invitations",
      JSON.stringify(includeInvites ? invitations : [])
    );

    try {
      const res = await createProjectAction({}, formData);
      if (res.error) {
        setGeneralError(res.error);
        setLoading(false);
        return;
      }

      if (res.success && res.projectId) {
        setSuccessResult({
          projectId: res.projectId,
          summary: res.summary,
          invitations: res.invitations,
        });
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2500);
  }

  // Success screen
  if (successResult) {
    const s = successResult.summary;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#34D399]">
          <CheckCircle2 size={32} />
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Project Created Successfully!
        </h2>
        <p className="mt-1 text-sm text-[#A5A5C0]">
          You have been automatically assigned as the{" "}
          <strong className="text-white">Project Administrator</strong> in Neon PostgreSQL.
        </p>

        {s && (
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#A5A5C0]">Invitations Created</p>
              <p className="mt-1 text-xl font-bold text-white">{s.totalInvited}</p>
            </div>
            <div>
              <p className="text-xs text-[#A5A5C0]">Emails Dispatched</p>
              <p className="mt-1 text-xl font-bold text-[#34D399]">{s.sentCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#A5A5C0]">Email Provider</p>
              <p className="mt-1 text-xs font-medium text-white">
                {s.emailConfigured ? "Resend (Active)" : "Manual Links"}
              </p>
            </div>
          </div>
        )}

        {/* Display Invitation Links / Fallback Copy */}
        {successResult.invitations && successResult.invitations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Invitation Links ({successResult.invitations.length})
            </h3>
            <p className="text-xs text-[#A5A5C0]">
              {!s?.emailConfigured
                ? "Since live email credentials are not set on the server, you can copy each secure link below to send directly to your teammates:"
                : "Invitation emails have been submitted to the email service. You can also copy the direct links below:"}
            </p>

            <div className="space-y-2">
              {successResult.invitations.map((inv) => (
                <div
                  key={inv.email}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{inv.email}</p>
                    <p className="text-[#A5A5C0]">Role: {inv.role}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(inv.inviteUrl)}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-white transition hover:bg-white/10 sm:self-auto"
                  >
                    {copiedLink === inv.inviteUrl ? (
                      <>
                        <Check size={14} className="text-[#34D399]" />
                        <span className="text-[#34D399]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(`/projects/${successResult.projectId}`)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5]"
          >
            <span>Open Project Workspace</span>
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/projects/${successResult.projectId}/admin`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <span>Manage Members</span>
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Wizard Step Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
              step === 1
                ? "bg-[#6366F1] text-white"
                : "bg-white/10 text-[#A5A5C0] hover:text-white"
            }`}
          >
            1
          </button>
          <span className={`text-sm font-medium ${step === 1 ? "text-white" : "text-[#A5A5C0]"}`}>
            Project Details
          </span>
          <span className="mx-2 text-white/20">&rarr;</span>
          <button
            type="button"
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
              step === 2
                ? "bg-[#6366F1] text-white"
                : "bg-white/10 text-[#A5A5C0] disabled:opacity-40"
            }`}
          >
            2
          </button>
          <span className={`text-sm font-medium ${step === 2 ? "text-white" : "text-[#A5A5C0]"}`}>
            Invite Team (Optional)
          </span>
        </div>
      </div>

      {generalError && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3.5 text-sm text-[#F43F5E]">
          <AlertCircle size={18} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* STEP 1: Project Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-white">
              Project Name <span className="text-[#8B5CF6]">*</span>
            </label>
            <p className="mt-0.5 text-xs text-[#A5A5C0]">
              A recognizable name for your software, system, or handover workspace.
            </p>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Campus Pay, Billing Platform, Core API"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#6B6B88] transition focus:border-[#6366F1] focus:bg-white/[0.08] focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="projectDesc" className="block text-sm font-medium text-white">
              Description <span className="text-xs text-[#A5A5C0]">(Optional)</span>
            </label>
            <p className="mt-0.5 text-xs text-[#A5A5C0]">
              Brief context about this project for incoming teammates and reviewers.
            </p>
            <textarea
              id="projectDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this project do? Key architecture decisions, repository locations, or handover goals..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#6B6B88] transition focus:border-[#6366F1] focus:bg-white/[0.08] focus:outline-none"
            />
          </div>

          <div className="pt-4">
            <div className="flex items-center gap-2 text-xs text-[#A5A5C0]">
              <ShieldCheck size={16} className="text-[#34D399]" />
              <span>You will automatically become the project administrator.</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading || !name.trim()}
              onClick={() => handleSubmit(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Skip Invites & Create Project
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-40"
            >
              <span>Next: Invite Teammates</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Invite Teammates */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Invite Team Members</h3>
            <p className="mt-0.5 text-xs text-[#A5A5C0]">
              Send secure 7-day invitation links. Team members can register or log in to join.
            </p>
          </div>

          {/* Add Recipient Row */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
              <div>
                <label className="sr-only">Recipient Email</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A5A5C0]"
                  />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInvite();
                      }
                    }}
                    placeholder="teammate@company.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm text-white placeholder-[#6B6B88] transition focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="sr-only">Project Role</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as InvitableRole)}
                  className="w-full rounded-xl border border-white/10 bg-[#161628] px-3 py-2 text-sm text-white transition focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="incoming">Incoming Member</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="leaver">Knowledge Leaver</option>
                  <option value="outsider">Guest / Viewer</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddInvite}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {inviteError && (
              <p className="mt-2 text-xs text-[#F43F5E]">{inviteError}</p>
            )}

            <p className="mt-2.5 text-[11px] text-[#82829E]">
              Note: Administrator role can only be assigned directly by an authorized project admin after creation.
            </p>
          </div>

          {/* Added Recipients List */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                Recipients to invite ({invitations.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {invitations.map((inv, idx) => (
                  <div
                    key={inv.email}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Mail size={15} className="text-[#C4B5FD]" />
                      <span className="font-medium text-white">{inv.email}</span>
                      <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs capitalize text-[#A5A5C0]">
                        {inv.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveInvite(idx)}
                      className="rounded p-1 text-[#A5A5C0] transition hover:bg-white/10 hover:text-[#F43F5E]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              &larr; Back to Details
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-[#A5A5C0] transition hover:text-white disabled:opacity-40"
              >
                Skip Invites & Create
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/25 transition hover:bg-[#4F46E5] disabled:opacity-40"
              >
                {loading ? (
                  <span>Saving to Neon...</span>
                ) : invitations.length > 0 ? (
                  <>
                    <UserPlus size={16} />
                    <span>Create Project & Send Invitations</span>
                  </>
                ) : (
                  <>
                    <FolderKanban size={16} />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
