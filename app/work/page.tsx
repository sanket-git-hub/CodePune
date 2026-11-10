import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WORK_ITEMS } from "@/lib/demo-data-extra";
import { WorkBoard } from "./work-board";

export default async function WorkPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Open work">
      <PageHeader
        title="Open work"
        subtitle="No loose ends. Just clear next steps."
      />
      <WorkBoard initial={WORK_ITEMS} />
    </AppShell>
  );
}
