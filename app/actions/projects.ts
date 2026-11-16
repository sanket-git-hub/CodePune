"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createProjectWithTransaction,
  inviteTeamMember,
  resendInvitation,
  revokeInvitation,
  isUserProjectAdmin,
  type InvitableRole,
} from "@/lib/projects";
import { pool } from "@/lib/db";

async function getSessionUser() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    // Check if demo user fallback or need login
    return null;
  }

  // Look up full user from DB by ID or email
  const { rows } = await pool.query(
    "SELECT id::text, name, email, role FROM users WHERE id = $1::bigint OR LOWER(email) = LOWER($2)",
    [session.user.id.match(/^\d+$/) ? session.user.id : null, session.user.email ?? ""]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role: session.user.role || "incoming",
  };
}

export type CreateProjectState = {
  success?: boolean;
  error?: string;
  projectId?: string;
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
};

export async function createProjectAction(
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "You must be signed in to create a project." };
  }

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const rawInvitations = String(formData.get("invitations") || "[]");

  if (!name) {
    return { error: "Project name is required." };
  }

  let invitations: Array<{ email: string; role: InvitableRole }> = [];
  try {
    invitations = JSON.parse(rawInvitations);
  } catch {
    invitations = [];
  }

  try {
    const result = await createProjectWithTransaction({
      creatorUserId: user.id,
      creatorName: user.name || user.email || "Admin",
      name,
      description,
      invitations,
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return {
      success: true,
      projectId: result.project.id,
      summary: result.summary,
      invitations: result.invitations,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create project.";
    return { error: msg };
  }
}

export async function inviteMemberAction(
  projectId: string,
  arg2: FormData | { success?: boolean; error?: string; inviteUrl?: string },
  arg3?: FormData
) {
  const formData = arg2 instanceof FormData ? arg2 : (arg3 instanceof FormData ? arg3 : new FormData());
  const user = await getSessionUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const isAdmin = await isUserProjectAdmin(user.id, projectId, user.role);
  if (!isAdmin) {
    return { error: "Only project administrators can invite members." };
  }

  const email = String(formData.get("email") || "").trim();
  const role = String(formData.get("role") || "incoming") as InvitableRole;

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const result = await inviteTeamMember({
      projectId,
      inviterUserId: user.id,
      inviterName: user.name || user.email || "Project Admin",
      email,
      role,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/admin`);

    return {
      success: true,
      inviteUrl: result.inviteUrl,
      emailSent: result.emailSent,
      error: result.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to invite member.";
    return { error: msg };
  }
}

export async function resendInvitationAction(projectId: string, invitationId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const isAdmin = await isUserProjectAdmin(user.id, projectId, user.role);
  if (!isAdmin) {
    return { error: "Only project administrators can resend invitations." };
  }

  try {
    const result = await resendInvitation({
      invitationId,
      actorUserId: user.id,
      actorName: user.name || user.email || "Project Admin",
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/admin`);

    return {
      success: true,
      inviteUrl: result.inviteUrl,
      emailSent: result.emailSent,
      error: result.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resend invitation.";
    return { error: msg };
  }
}

export async function revokeInvitationAction(projectId: string, invitationId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const isAdmin = await isUserProjectAdmin(user.id, projectId, user.role);
  if (!isAdmin) {
    return { error: "Only project administrators can revoke invitations." };
  }

  try {
    await revokeInvitation({
      invitationId,
      actorUserId: user.id,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/admin`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { error: msg };
  }
}
