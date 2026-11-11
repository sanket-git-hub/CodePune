import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { BriefClient } from "./brief-client";

export default async function BriefPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Handover brief">
      <PageHeader
        title="Handover brief"
        subtitle="One clear document. A confident next chapter."
      />
      <BriefClient />
    </AppShell>
  );
}
