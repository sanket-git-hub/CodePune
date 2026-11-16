// app/api/email/google/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmailViaGmail, getStoredGmailRefreshToken } from "@/lib/gmail";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { senderEmail } = await getStoredGmailRefreshToken();
    const recipient = session.user.email || senderEmail;

    if (!recipient) {
      return NextResponse.json({ error: "No recipient email available for test." }, { status: 400 });
    }

    const res = await sendEmailViaGmail({
      to: recipient,
      subject: "Baton - Gmail Integration Test",
      html: `
        <div style="font-family: sans-serif; background-color: #0b0b14; color: #f4f4fa; padding: 24px; border-radius: 8px;">
          <h2 style="color: #8b5cf6;">Gmail API Connected Successfully!</h2>
          <p>This is a verification test from your Baton workspace.</p>
          <p style="color: #34d399; font-weight: bold;">&check; Invitation emails will now be delivered automatically from your Gmail account without opening Gmail tabs.</p>
          <hr style="border-color: rgba(255,255,255,0.1);" />
          <p style="font-size: 11px; color: #888;">Baton AI Knowledge Continuity Platform</p>
        </div>
      `,
      text: "Gmail API Connected Successfully!\n\nThis is a verification test from your Baton workspace. Invitation emails will now be delivered automatically from your Gmail account without opening Gmail tabs.",
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to send test email" }, { status: 500 });
    }

    await writeAudit({
      userId: session.user.id,
      action: "gmail.test_sent",
      entity: "system_settings",
      detail: { recipient, messageId: res.messageId },
    });

    return NextResponse.json({
      success: true,
      recipient,
      messageId: res.messageId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
