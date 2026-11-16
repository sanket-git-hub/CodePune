// app/api/email/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOAuth2Client, saveGmailTokens } from "@/lib/gmail";
import { google } from "googleapis";
import { writeAudit } from "@/lib/audit";

/**
 * GET /api/email/google/callback
 * Receives Google OAuth authorization response, exchanges code for refresh token,
 * verifies email address, encrypts token at rest, and redirects back to settings.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login?error=session_expired", req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/projects?error=${encodeURIComponent(`Google authorization error: ${error}`)}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/projects?error=missing_oauth_code", req.url));
    }

    // CSRF State Validation
    const cookieState = req.cookies.get("gmail_oauth_state")?.value;
    if (!cookieState || cookieState !== state) {
      return NextResponse.redirect(new URL("/projects?error=invalid_oauth_state", req.url));
    }

    let parsedState: { userId?: string; projectId?: string } = {};
    try {
      parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      // ignore
    }

    // Determine redirect URI
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/email/google/callback`;

    const oauth2Client = getOAuth2Client(redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch authorized Gmail address
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const senderEmail = userInfo.data.email || session.user.email || null;

    if (!tokens.refresh_token) {
      console.warn(
        "[Gmail OAuth] No refresh_token returned by Google. If already authorized, token may be cached in DB or prompt='consent' was bypassed."
      );
    }

    // Save tokens encrypted in database
    await saveGmailTokens({
      refreshToken: tokens.refresh_token,
      email: senderEmail,
    });

    await writeAudit({
      userId: session.user.id,
      action: "gmail.connected",
      entity: "system_settings",
      detail: { senderEmail, hasRefreshToken: Boolean(tokens.refresh_token) },
    });

    const returnUrl = parsedState.projectId
      ? `/projects/${parsedState.projectId}/admin?gmail=connected`
      : "/projects?gmail=connected";

    const response = NextResponse.redirect(new URL(returnUrl, req.url));
    // Clear CSRF cookie
    response.cookies.delete("gmail_oauth_state");

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Gmail Callback Error]:", msg);
    return NextResponse.redirect(new URL(`/projects?error=${encodeURIComponent(msg)}`, req.url));
  }
}
