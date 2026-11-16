"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { acceptInvitation } from "@/lib/projects";
import { pool } from "@/lib/db";

export async function acceptInvitationAction(rawToken: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.email) {
    return {
      error: "You must be signed in to accept this invitation. Please sign in or register first.",
      requireAuth: true,
    };
  }

  // Get user ID from database
  let userId = session.user.id;
  if (!userId || !userId.match(/^\d+$/)) {
    const { rows } = await pool.query(
      "SELECT id::text FROM users WHERE LOWER(email) = LOWER($1)",
      [session.user.email]
    );
    if (rows.length > 0) {
      userId = rows[0].id;
    }
  }

  if (!userId) {
    return { error: "User account could not be found." };
  }

  try {
    const result = await acceptInvitation({
      rawToken,
      authenticatedUserId: userId,
      authenticatedUserEmail: session.user.email,
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${result.projectId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      projectId: result.projectId,
      projectName: result.projectName,
      role: result.role,
      alreadyMember: result.alreadyMember,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to accept invitation.";
    return { error: msg };
  }
}
