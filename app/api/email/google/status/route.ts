// app/api/email/google/status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGmailConnectionStatus } from "@/lib/gmail";

/**
 * GET /api/email/google/status
 * Shows whether Gmail is connected, sender email, and provider mode.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getGmailConnectionStatus();

    return NextResponse.json({
      connected: status.connected,
      senderEmail: status.senderEmail,
      source: status.source,
      error: status.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
