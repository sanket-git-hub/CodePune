import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ProjectWizard } from "./project-wizard";

export default async function NewProjectPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="New Project" isDemo={false}>
      <PageHeader
        eyebrow="CREATION WIZARD"
        title="Create a New Project"
        subtitle="Set up your engineering workspace and invite your handover teammates."
      />

      <div className="mt-8">
        <ProjectWizard />
      </div>
    </AppShell>
  );
}
