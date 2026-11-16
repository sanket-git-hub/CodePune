// lib/email.ts - Email sending service exclusively via Gmail API
import { sendEmailViaGmail, getStoredGmailRefreshToken } from "./gmail";
import { formatRoleName } from "./roles";

export { formatRoleName };

export type SendInvitationParams = {
  toEmail: string;
  inviterName: string;
  projectName: string;
  projectDescription?: string | null;
  role: string;
  inviteUrl: string;
  expiresInDays?: number;
};

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  configured: boolean;
  provider?: "gmail";
};

export async function isEmailConfigured(): Promise<boolean> {
  const gmail = await getStoredGmailRefreshToken();
  return Boolean(gmail.token);
}

export async function sendProjectInvitationEmail({
  toEmail,
  inviterName,
  projectName,
  projectDescription,
  role,
  inviteUrl,
  expiresInDays = 7,
}: SendInvitationParams): Promise<EmailSendResult> {
  const roleDisplay = formatRoleName(role);
  const subject = `You're invited to join ${projectName} on Baton`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b14; color: #f4f4fa; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #131322; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 24px; }
    .logo span { color: #8b5cf6; }
    h1 { font-size: 22px; margin-top: 0; margin-bottom: 16px; color: #ffffff; }
    p { font-size: 15px; line-height: 1.6; color: #a5a5c0; margin: 12px 0; }
    .highlight-card { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 16px; margin: 20px 0; }
    .highlight-card strong { color: #f4f4fa; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35); }
    .footer { font-size: 12px; color: #6b6b88; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
    .code { font-family: monospace; font-size: 12px; color: #8b5cf6; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Baton<span>.</span></div>
    <h1>You've been invited to join ${projectName}</h1>
    <p>
      <strong>${inviterName}</strong> has invited you to collaborate on <strong>${projectName}</strong> as a <strong>${roleDisplay}</strong> on Baton.
    </p>

    ${projectDescription ? `<p style="font-size: 14px; font-style: italic; color: #8b8ba8;">&ldquo;${projectDescription}&rdquo;</p>` : ""}

    <div class="highlight-card">
      <p style="margin: 0; font-size: 14px; color: #c4b5fd;">
        <strong>Your Assigned Role:</strong> ${roleDisplay}
      </p>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #a5a5c0;">
        You will receive verified technical decisions, continuity roadmap milestones, and handover context.
      </p>
    </div>

    <div class="btn-container">
      <a href="${inviteUrl}" class="btn" target="_blank" rel="noopener noreferrer">Accept Invitation &rarr;</a>
    </div>

    <p style="font-size: 13px; color: #8b8ba8; margin-top: 24px;">
      Or paste this URL into your browser: <br />
      <span class="code">${inviteUrl}</span>
    </p>

    <div class="footer">
      <p style="margin: 0; font-size: 12px;">This invitation expires in ${expiresInDays} days. If you did not expect this invitation, you can ignore this email.</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #52526e;">Baton AI &bull; Intelligent Knowledge Continuity Platform</p>
    </div>
  </div>
</body>
</html>`;

  const text = `You've been invited to join ${projectName} on Baton!

${inviterName} has invited you to join ${projectName} on Baton as a ${roleDisplay}.

${projectDescription ? `About the project: ${projectDescription}\n\n` : ""}Click the link below to review and accept your invitation:
${inviteUrl}

This invitation expires in ${expiresInDays} days.

If you were not expecting this invitation, you can safely ignore this email.

--
Baton AI - Intelligent Knowledge Continuity Platform`;

  // Check Gmail authorization
  const gmail = await getStoredGmailRefreshToken();
  if (!gmail.token) {
    return {
      success: false,
      configured: false,
      provider: "gmail",
      error: "Gmail is not connected. Please click 'Connect Gmail' in Project Settings to authorize sending emails from your Gmail account.",
    };
  }

  const res = await sendEmailViaGmail({
    to: toEmail,
    subject,
    html,
    text,
  });

  if (res.success) {
    return {
      success: true,
      configured: true,
      provider: "gmail",
      messageId: res.messageId,
    };
  }

  return {
    success: false,
    configured: true,
    provider: "gmail",
    error: res.error,
  };
}
