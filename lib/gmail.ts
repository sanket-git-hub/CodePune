// lib/gmail.ts
// Secure Gmail API integration via Google OAuth 2.0 with offline refresh token
import { google } from "googleapis";
import crypto from "crypto";
import { pool } from "./db";

export type GmailStatus = {
  connected: boolean;
  senderEmail: string | null;
  error?: string;
  source?: "env" | "database" | "none";
};

// Encryption helpers for storing token securely at rest
const ENCRYPTION_ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || "default-secret-key-32-chars-long!!";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(cipherPackage: string): string {
  try {
    const [ivHex, tagHex, dataHex] = cipherPackage.split(":");
    if (!ivHex || !tagHex || !dataHex) return cipherPackage;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final("utf8");
  } catch {
    return cipherPackage;
  }
}

/**
 * Gets OAuth client with configured credentials and redirect URI
 */
export function getOAuth2Client(customRedirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
  const redirectUri =
    customRedirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/email/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates authorization URL with state and minimal scope
 */
export function getGmailAuthUrl(state: string, redirectUri?: string): string {
  const oauth2Client = getOAuth2Client(redirectUri);

  // Minimum required scope: sending only! No inbox reading.
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force consent so Google sends refresh_token
    scope: scopes,
    state,
  });
}

/**
 * Stores or retrieves Gmail tokens
 */
export async function saveGmailTokens(tokens: {
  refreshToken?: string | null;
  email?: string | null;
}) {
  // Ensure settings table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      encrypted   BOOLEAN NOT NULL DEFAULT false,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  if (tokens.refreshToken) {
    const encrypted = encryptToken(tokens.refreshToken);
    await pool.query(
      `INSERT INTO system_settings (key, value, encrypted, updated_at)
       VALUES ('gmail_refresh_token', $1, true, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, encrypted = true, updated_at = now()`,
      [encrypted]
    );
  }

  if (tokens.email) {
    await pool.query(
      `INSERT INTO system_settings (key, value, encrypted, updated_at)
       VALUES ('gmail_sender_email', $1, false, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [tokens.email]
    );
  }
}

export async function getStoredGmailRefreshToken(): Promise<{
  token: string | null;
  senderEmail: string | null;
  source: "env" | "database" | "none";
}> {
  // 1. Check environment variable first
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      token: process.env.GOOGLE_REFRESH_TOKEN.trim(),
      senderEmail: process.env.GMAIL_SENDER_EMAIL || null,
      source: "env",
    };
  }

  // 2. Check system_settings table in database
  try {
    const { rows } = await pool.query(
      `SELECT key, value, encrypted FROM system_settings WHERE key IN ('gmail_refresh_token', 'gmail_sender_email')`
    );

    let token: string | null = null;
    let senderEmail: string | null = null;

    for (const r of rows) {
      if (r.key === "gmail_refresh_token") {
        token = r.encrypted ? decryptToken(r.value) : r.value;
      }
      if (r.key === "gmail_sender_email") {
        senderEmail = r.value;
      }
    }

    if (token) {
      return { token, senderEmail, source: "database" };
    }
  } catch {
    // table may not exist yet
  }

  return { token: null, senderEmail: null, source: "none" };
}

export async function disconnectGmail(): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM system_settings WHERE key IN ('gmail_refresh_token', 'gmail_sender_email')`
    );
  } catch {
    // Ignore error
  }
}

/**
 * Checks connection status
 */
export async function getGmailConnectionStatus(): Promise<GmailStatus> {
  const { token, senderEmail, source } = await getStoredGmailRefreshToken();
  if (!token) {
    return { connected: false, senderEmail: null, source: "none" };
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: token });
    // Test access token refresh
    const accessToken = await oauth2Client.getAccessToken();
    if (!accessToken.token) {
      return { connected: false, senderEmail, error: "Unable to refresh access token", source };
    }
    return { connected: true, senderEmail, source };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, senderEmail, error: msg, source };
  }
}

/**
 * Formats standard RFC 2822 email message
 */
function makeRawEmail({
  to,
  from,
  subject,
  html,
  text,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}): string {
  const boundary = `boundary_${Date.now().toString(16)}`;

  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends email directly through Gmail API using stored refresh token
 */
export async function sendEmailViaGmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { token, senderEmail } = await getStoredGmailRefreshToken();

  if (!token) {
    return {
      success: false,
      error: "Gmail is not authorized yet. Please connect your Gmail account in Project Settings.",
    };
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: token });

  const fromAddress = senderEmail ? `Baton <${senderEmail}>` : "Baton";
  const raw = makeRawEmail({
    to,
    from: fromAddress,
    subject,
    html,
    text,
  });

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return {
      success: true,
      messageId: res.data.id || undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Gmail API error]:", msg);
    return {
      success: false,
      error: `Gmail delivery error: ${msg}`,
    };
  }
}
