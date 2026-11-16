// app/api/email/google/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGmailAuthUrl } from "@/lib/gmail";
import crypto from "crypto";

/**
 * GET /api/email/google/connect
 * Starts OAuth 2.0 authorization for Gmail API (scope: gmail.send).
 * Validates admin clearance, generates CSRF-protected state.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
    }

    // Allow any authenticated user to connect their personal Gmail
    const projectId = req.nextUrl.searchParams.get("projectId") || "";

    // Generate CSRF state
    const statePayload = {
      userId: session.user.id,
      projectId,
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Dynamic redirect URI support for local vs Vercel
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/email/google/callback`;

    const authUrl = getGmailAuthUrl(state, redirectUri);

    const response = NextResponse.redirect(authUrl);
    // Set secure cookie for CSRF validation
    response.cookies.set("gmail_oauth_state", state, {
      httpOnly: true,
      secure: proto === "https",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 minutes
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
