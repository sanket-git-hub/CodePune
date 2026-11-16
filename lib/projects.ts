// lib/projects.ts - Project management, RBAC, invitations, and Neon PostgreSQL persistence
import crypto from "crypto";
import { pool } from "./db";
import { writeAudit } from "./audit";
import { sendProjectInvitationEmail } from "./email";

export type ProjectRole = "admin" | "reviewer" | "leaver" | "incoming" | "outsider";
export type InvitableRole = "admin" | "reviewer" | "leaver" | "incoming" | "outsider";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  email: string;
  role: ProjectRole;
  created_at: string;
};

export type ProjectInvitation = {
  id: string;
  project_id: string;
  invited_by: string;
  inviter_name?: string;
  project_name?: string;
  project_description?: string | null;
  invited_email: string;
  invited_role: InvitableRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invite_url?: string; // Only included for authorized admins when generated
};

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://byebyebrain.vercel.app"
  ).replace(/\/+$/, "");
}

export function isValidBigInt(val: unknown): boolean {
  if (typeof val === "number") return Number.isInteger(val) && val > 0;
  if (typeof val === "string") return /^\d+$/.test(val.trim());
  return false;
}

/**
 * Checks if a user is an admin of a project or a global admin.
 */
export async function isUserProjectAdmin(
  userId: string | number,
  projectId: string | number,
  globalRole?: string
): Promise<boolean> {
  if (globalRole === "admin") return true;
  if (!isValidBigInt(projectId) || !isValidBigInt(userId)) return false;

  const { rows } = await pool.query(
    `SELECT role FROM project_members
     WHERE project_id = $1::bigint AND user_id = $2::bigint`,
    [projectId, userId]
  );

  return rows.length > 0 && rows[0].role === "admin";
}

/**
 * Creates a project with its creator as 'admin' in project_members and optional invitations,
 * strictly within a single atomic database transaction.
 */
export async function createProjectWithTransaction({
  creatorUserId,
  creatorName,
  name,
  description,
  invitations = [],
}: {
  creatorUserId: string | number;
  creatorName: string;
  name: string;
  description?: string | null;
  invitations?: Array<{ email: string; role: InvitableRole }>;
}) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new Error("Project name must be at least 2 characters.");
  }
  if (cleanName.length > 100) {
    throw new Error("Project name must be 100 characters or fewer.");
  }

  // Validate invitations
  const validInvites: Array<{ email: string; role: InvitableRole; token: string; hash: string }> = [];
  const seenEmails = new Set<string>();

  for (const inv of invitations) {
    const email = inv.email.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    const role: InvitableRole = ["admin", "reviewer", "leaver", "incoming", "outsider"].includes(inv.role)
      ? inv.role
      : "incoming";

    const token = generateSecureToken();
    const hash = hashToken(token);
    validInvites.push({ email, role, token, hash });
  }

  const client = await pool.connect();
  let projectId: string;
  let createdProject: Project;

  try {
    await client.query("BEGIN");

    // 1. Insert Project
    const projResult = await client.query(
      `INSERT INTO projects (name, description, created_by)
       VALUES ($1, $2, $3::bigint)
       RETURNING id::text, name, description, created_by::text, created_at::text`,
      [cleanName, description?.trim() || null, creatorUserId]
    );
    createdProject = projResult.rows[0];
    projectId = createdProject.id;

    // 2. Creator automatically becomes project admin in project_members
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1::bigint, $2::bigint, 'admin')
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'admin'`,
      [projectId, creatorUserId]
    );

    // 3. Create Invitation records
    for (const inv of validInvites) {
      await client.query(
        `INSERT INTO project_invitations
         (project_id, invited_by, invited_email, invited_role, token_hash, status, expires_at)
         VALUES ($1::bigint, $2::bigint, $3, $4, $5, 'pending', now() + INTERVAL '7 days')`,
        [projectId, creatorUserId, inv.email, inv.role, inv.hash]
      );
    }

    // 4. Record audit entry
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
       VALUES ($1::bigint, 'project.create', 'project', $2, $3::jsonb)`,
      [
        creatorUserId,
        projectId,
        JSON.stringify({
          name: cleanName,
          invitationsCount: validInvites.length,
        }),
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[ProjectService] Project creation transaction failed:", err);
    throw err;
  } finally {
    client.release();
  }

  // 5. Send emails AFTER the database transaction commits
  const baseUrl = getAppUrl();
  const invitationResults: Array<{
    email: string;
    role: InvitableRole;
    inviteUrl: string;
    emailSent: boolean;
    error?: string;
  }> = [];

  let sentCount = 0;
  let failedCount = 0;

  for (const inv of validInvites) {
    const inviteUrl = `${baseUrl}/invite/${inv.token}`;
    const emailRes = await sendProjectInvitationEmail({
      toEmail: inv.email,
      inviterName: creatorName,
      projectName: cleanName,
      projectDescription: description,
      role: inv.role,
      inviteUrl,
      expiresInDays: 7,
    });

    if (emailRes.success) {
      sentCount++;
      invitationResults.push({
        email: inv.email,
        role: inv.role,
        inviteUrl,
        emailSent: true,
      });
    } else {
      failedCount++;
      invitationResults.push({
        email: inv.email,
        role: inv.role,
        inviteUrl,
        emailSent: false,
        error: emailRes.error,
      });
    }
  }

  return {
    project: createdProject,
    invitations: invitationResults,
    summary: {
      totalInvited: validInvites.length,
      sentCount,
      failedCount,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
    },
  };
}

/**
 * Invites a new team member to an existing project.
 */
export async function inviteTeamMember({
  projectId,
  inviterUserId,
  inviterName,
  email,
  role,
}: {
  projectId: string | number;
  inviterUserId: string | number;
  inviterName: string;
  email: string;
  role: InvitableRole;
}) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid email address is required.");
  }

  // Verify project exists
  const projRes = await pool.query(
    "SELECT id::text, name, description FROM projects WHERE id = $1::bigint",
    [projectId]
  );
  if (projRes.rows.length === 0) {
    throw new Error("Project not found.");
  }
  const project = projRes.rows[0];

  // Check if target user is already a member
  const memberCheck = await pool.query(
    `SELECT pm.id, pm.role FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1::bigint AND LOWER(u.email) = $2`,
    [projectId, cleanEmail]
  );
  if (memberCheck.rows.length > 0) {
    throw new Error(`This user (${cleanEmail}) is already a member of this project.`);
  }

  // Revoke any previous pending invitation for this email on this project
  await pool.query(
    `UPDATE project_invitations
     SET status = 'revoked'
     WHERE project_id = $1::bigint AND LOWER(invited_email) = $2 AND status = 'pending'`,
    [projectId, cleanEmail]
  );

  const token = generateSecureToken();
  const hash = hashToken(token);

  await pool.query(
    `INSERT INTO project_invitations
     (project_id, invited_by, invited_email, invited_role, token_hash, status, expires_at)
     VALUES ($1::bigint, $2::bigint, $3, $4, $5, 'pending', now() + INTERVAL '7 days')`,
    [projectId, inviterUserId, cleanEmail, role, hash]
  );

  await writeAudit({
    userId: String(inviterUserId),
    action: "invitation.create",
    entity: "project_invitation",
    entityId: String(projectId),
    detail: { email: cleanEmail, role },
  });

  const baseUrl = getAppUrl();
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const emailRes = await sendProjectInvitationEmail({
    toEmail: cleanEmail,
    inviterName,
    projectName: project.name,
    projectDescription: project.description,
    role,
    inviteUrl,
    expiresInDays: 7,
  });

  return {
    email: cleanEmail,
    role,
    inviteUrl,
    emailSent: emailRes.success,
    error: emailRes.error,
    emailConfigured: emailRes.configured,
  };
}

/**
 * Resends an existing invitation by safely rotating the token and refreshing expiration.
 */
export async function resendInvitation({
  invitationId,
  actorUserId,
  actorName,
}: {
  invitationId: string | number;
  actorUserId: string | number;
  actorName: string;
}) {
  const { rows } = await pool.query(
    `SELECT pi.id, pi.project_id, pi.invited_email, pi.invited_role, pi.status,
            p.name AS project_name, p.description AS project_description
     FROM project_invitations pi
     JOIN projects p ON pi.project_id = p.id
     WHERE pi.id = $1::bigint`,
    [invitationId]
  );

  if (rows.length === 0) {
    throw new Error("Invitation not found.");
  }
  const inv = rows[0];

  const newToken = generateSecureToken();
  const newHash = hashToken(newToken);

  await pool.query(
    `UPDATE project_invitations
     SET token_hash = $1, status = 'pending', expires_at = now() + INTERVAL '7 days'
     WHERE id = $2::bigint`,
    [newHash, invitationId]
  );

  await writeAudit({
    userId: String(actorUserId),
    action: "invitation.resend",
    entity: "project_invitation",
    entityId: String(invitationId),
    detail: { email: inv.invited_email, projectId: inv.project_id },
  });

  const baseUrl = getAppUrl();
  const inviteUrl = `${baseUrl}/invite/${newToken}`;

  const emailRes = await sendProjectInvitationEmail({
    toEmail: inv.invited_email,
    inviterName: actorName,
    projectName: inv.project_name,
    projectDescription: inv.project_description,
    role: inv.invited_role,
    inviteUrl,
    expiresInDays: 7,
  });

  return {
    id: String(inv.id),
    email: inv.invited_email,
    inviteUrl,
    emailSent: emailRes.success,
    error: emailRes.error,
  };
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation({
  invitationId,
  actorUserId,
}: {
  invitationId: string | number;
  actorUserId: string | number;
}) {
  const result = await pool.query(
    `UPDATE project_invitations
     SET status = 'revoked'
     WHERE id = $1::bigint AND status = 'pending'
     RETURNING id, project_id, invited_email`,
    [invitationId]
  );

  if (result.rowCount === 0) {
    throw new Error("Invitation could not be revoked or is no longer pending.");
  }

  await writeAudit({
    userId: String(actorUserId),
    action: "invitation.revoke",
    entity: "project_invitation",
    entityId: String(invitationId),
    detail: { email: result.rows[0].invited_email },
  });

  return { success: true };
}

/**
 * Validates and retrieves an invitation by its raw token (via SHA-256 hash).
 * Updates expired invitations if the date has passed.
 */
export async function getInvitationByToken(rawToken: string) {
  if (!rawToken || rawToken.trim().length < 16) {
    return { valid: false, error: "Invalid invitation token." };
  }

  const hash = hashToken(rawToken);

  const { rows } = await pool.query(
    `SELECT pi.id::text, pi.project_id::text, pi.invited_email, pi.invited_role,
            pi.status, pi.expires_at, pi.accepted_at, pi.created_at,
            p.name AS project_name, p.description AS project_description,
            u.name AS inviter_name, u.email AS inviter_email
     FROM project_invitations pi
     JOIN projects p ON pi.project_id = p.id
     JOIN users u ON pi.invited_by = u.id
     WHERE pi.token_hash = $1`,
    [hash]
  );

  if (rows.length === 0) {
    return { valid: false, error: "Invitation not found or invalid token." };
  }

  const inv = rows[0];

  // Check expiration
  if (inv.status === "pending" && new Date(inv.expires_at) < new Date()) {
    await pool.query(
      "UPDATE project_invitations SET status = 'expired' WHERE id = $1::bigint",
      [inv.id]
    );
    inv.status = "expired";
  }

  return {
    valid: true,
    invitation: {
      id: inv.id,
      projectId: inv.project_id,
      projectName: inv.project_name,
      projectDescription: inv.project_description,
      inviterName: inv.inviter_name || "A team administrator",
      invitedEmail: inv.invited_email,
      invitedRole: inv.invited_role as InvitableRole,
      status: inv.status,
      expiresAt: inv.expires_at,
      acceptedAt: inv.accepted_at,
    },
  };
}

/**
 * Accepts an invitation.
 * Checks:
 * 1. Token exists, pending, not expired.
 * 2. Authenticated user email matches invited_email.
 * 3. Enforces single-use.
 * 4. Adds user to project_members.
 */
export async function acceptInvitation({
  rawToken,
  authenticatedUserId,
  authenticatedUserEmail,
}: {
  rawToken: string;
  authenticatedUserId: string | number;
  authenticatedUserEmail: string;
}) {
  const hash = hashToken(rawToken);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT pi.id, pi.project_id, pi.invited_email, pi.invited_role, pi.status, pi.expires_at,
              p.name AS project_name
       FROM project_invitations pi
       JOIN projects p ON pi.project_id = p.id
       WHERE pi.token_hash = $1
       FOR UPDATE`,
      [hash]
    );

    if (rows.length === 0) {
      throw new Error("Invalid or unrecognized invitation link.");
    }

    const inv = rows[0];

    // Check status
    if (inv.status === "accepted") {
      throw new Error("This invitation has already been accepted.");
    }
    if (inv.status === "revoked") {
      throw new Error("This invitation has been revoked by a project administrator.");
    }
    if (inv.status === "expired" || new Date(inv.expires_at) < new Date()) {
      await client.query(
        "UPDATE project_invitations SET status = 'expired' WHERE id = $1::bigint",
        [inv.id]
      );
      throw new Error("This invitation link has expired (invitations are valid for 7 days).");
    }

    // Security check: Recipient's authenticated email must match invited_email
    const normAuthEmail = authenticatedUserEmail.trim().toLowerCase();
    const normInvitedEmail = inv.invited_email.trim().toLowerCase();

    if (normAuthEmail !== normInvitedEmail) {
      throw new Error(
        `Email mismatch: This invitation was issued for ${normInvitedEmail}, but you are currently signed in as ${normAuthEmail}. Please log in with the invited email address to accept.`
      );
    }

    // Check if user is already a project member
    const existingMember = await client.query(
      `SELECT id, role FROM project_members
       WHERE project_id = $1::bigint AND user_id = $2::bigint`,
      [inv.project_id, authenticatedUserId]
    );

    if (existingMember.rows.length > 0) {
      // Mark invitation accepted anyway so it cannot linger
      await client.query(
        `UPDATE project_invitations
         SET status = 'accepted', accepted_at = now()
         WHERE id = $1::bigint`,
        [inv.id]
      );
      await client.query("COMMIT");
      return {
        alreadyMember: true,
        projectId: String(inv.project_id),
        projectName: inv.project_name,
        role: existingMember.rows[0].role,
      };
    }

    // Add user to project_members with the invited role
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1::bigint, $2::bigint, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [inv.project_id, authenticatedUserId, inv.invited_role]
    );

    // Mark invitation accepted
    await client.query(
      `UPDATE project_invitations
       SET status = 'accepted', accepted_at = now()
       WHERE id = $1::bigint`,
      [inv.id]
    );

    // Write audit log
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
       VALUES ($1::bigint, 'invitation.accept', 'project_member', $2, $3::jsonb)`,
      [
        authenticatedUserId,
        inv.project_id,
        JSON.stringify({
          invitationId: inv.id,
          role: inv.invited_role,
        }),
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      projectId: String(inv.project_id),
      projectName: inv.project_name,
      role: inv.invited_role,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieves full project details, members, and invitations for admin view.
 * Token hashes are NEVER returned.
 */
export async function getProjectAdminData(projectId: string | number) {
  if (!isValidBigInt(projectId)) return null;

  const projRes = await pool.query(
    `SELECT id::text, name, description, created_by::text, created_at::text
     FROM projects
     WHERE id = $1::bigint`,
    [projectId]
  );

  if (projRes.rows.length === 0) return null;
  const project = projRes.rows[0];

  const membersRes = await pool.query(
    `SELECT pm.id::text, pm.project_id::text, pm.user_id::text,
            u.name, u.email, pm.role, pm.created_at::text
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1::bigint
     ORDER BY
       CASE pm.role WHEN 'admin' THEN 1 WHEN 'reviewer' THEN 2 WHEN 'leaver' THEN 3 WHEN 'incoming' THEN 4 ELSE 5 END,
       pm.created_at ASC`,
    [projectId]
  );

  const invitationsRes = await pool.query(
    `SELECT id::text, project_id::text, invited_by::text, invited_email,
            invited_role, status, expires_at::text, accepted_at::text, created_at::text
     FROM project_invitations
     WHERE project_id = $1::bigint
     ORDER BY created_at DESC`,
    [projectId]
  );

  return {
    project,
    members: membersRes.rows as ProjectMember[],
    invitations: invitationsRes.rows as ProjectInvitation[],
  };
}

/**
 * Lists all projects accessible by a user (member of, created by, or all if global admin).
 */
export async function listUserProjects(userId: string | number, userRole: string) {
  if (userRole === "admin") {
    // Global admin can see all projects
    const { rows } = await pool.query(
      `SELECT p.id::text, p.name, p.description, p.created_by::text, p.created_at::text,
              COUNT(DISTINCT pm.user_id)::int AS member_count,
              COALESCE(bool_or(pm.user_id = $1::bigint AND pm.role = 'admin'), false) AS is_project_admin
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Non-admin sees projects they belong to or created
  const { rows } = await pool.query(
    `SELECT p.id::text, p.name, p.description, p.created_by::text, p.created_at::text,
            COUNT(DISTINCT pm_all.user_id)::int AS member_count,
            COALESCE(bool_or(pm_user.role = 'admin'), p.created_by = $1::bigint) AS is_project_admin,
            pm_user.role AS user_project_role
     FROM projects p
     LEFT JOIN project_members pm_user ON p.id = pm_user.project_id AND pm_user.user_id = $1::bigint
     LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
     WHERE pm_user.user_id IS NOT NULL OR p.created_by = $1::bigint
     GROUP BY p.id, pm_user.role
     ORDER BY p.created_at DESC`,
    [userId]
  );

  return rows;
}
