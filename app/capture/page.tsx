import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CaptureClient } from "./capture-client";

export default async function CapturePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Quick Capture">
      <PageHeader
        title="Quick Capture"
        subtitle="Messy notes in. Clear, connected knowledge out."
      />
      <CaptureClient />
    </AppShell>
  );
}
