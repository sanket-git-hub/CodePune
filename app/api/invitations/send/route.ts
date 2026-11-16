// app/api/invitations/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { inviteTeamMember, type InvitableRole } from "@/lib/projects";
import { z } from "zod";

const sendInvitationSchema = z.object({
  projectId: z.string().regex(/^\d+$/, "Invalid projectId"),
  email: z.string().trim().email("Invalid recipient email address"),
  role: z.enum(["admin", "reviewer", "leaver", "incoming", "outsider"]),
});

// Simple in-memory rate limiting: 15 invitations per minute per user
const inviteRateLimits = new Map<string, number[]>();
function checkInviteRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (inviteRateLimits.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= 15) return false;
  timestamps.push(now);
  inviteRateLimits.set(userId, timestamps);
  return true;
}

/**
 * POST /api/invitations/send
 * Validates recipient email, checks admin clearance, creates secure random 7-day token,
 * dispatches email through Gmail API (with fallback), and logs to audit_log.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkInviteRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before sending more invitations." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = sendInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { projectId, email, role } = parsed.data;

    // Check project admin clearance
    const { rows: memberRows } = await pool.query(
      `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
       WHERE u.id = $2::bigint`,
      [projectId, session.user.id]
    );

    const effectiveRole = memberRows[0]?.role || "incoming";
    if (effectiveRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only project administrators can invite team members" },
        { status: 403 }
      );
    }

    // Call inviteTeamMember (creates secure token, sends email, writes audit_log)
    const result = await inviteTeamMember({
      projectId,
      inviterUserId: session.user.id,
      inviterName: session.user.name || session.user.email || "Project Admin",
      email,
      role: role as InvitableRole,
    });

    if (!result.emailSent) {
      return NextResponse.json(
        {
          success: false,
          inviteUrl: result.inviteUrl,
          error: result.error || "Email delivery failed",
          message: "Invitation token generated securely, but email could not be delivered. Share the link manually.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      role: result.role,
      inviteUrl: result.inviteUrl,
      emailSent: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
