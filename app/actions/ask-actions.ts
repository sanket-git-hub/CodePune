"use server";

import { auth } from "@/auth";
import { askHandover, type AskResult } from "@/lib/ask";

export async function askQuestionAction(
  question: string,
  projectId?: string
): Promise<{ success: boolean; data?: AskResult; error?: string }> {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return { success: false, error: "Please log in to use Ask." };
    }

    if (user.role === "outsider") {
      return { success: false, error: "Outsider role does not have access to handover Q&A." };
    }

    const res = await askHandover({
      userId: user.id,
      userRole: user.role,
      projectId,
      question,
    });

    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
