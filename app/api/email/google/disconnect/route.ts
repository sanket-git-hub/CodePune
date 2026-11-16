// app/api/email/google/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectGmail } from "@/lib/gmail";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectGmail();

    await writeAudit({
      userId: session.user.id,
      action: "gmail.disconnected",
      entity: "system_settings",
      detail: {},
    });

    return NextResponse.json({ success: true, connected: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
