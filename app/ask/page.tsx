import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AskClient } from "./ask-client";

export default async function AskPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Ask Baton">
      <PageHeader
        title="Ask Baton"
        subtitle="Answers grounded in your team's captured knowledge."
      />
      <AskClient />
    </AppShell>
  );
}
