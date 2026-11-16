import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AskClient } from "./ask-client";
import { listUserProjects } from "@/lib/projects";

export default async function AskPage() {
  const user = await requireUser();

  // Route /ask. Allowed: incoming, reviewer, admin, leaver. NOT outsider.
  if (user.role === "outsider") {
    return (
      <AppShell user={user} section="Ask Baton" isDemo={false}>
        <PageHeader
          eyebrow="ACCESS CONTROL"
          title="Access Restricted"
          subtitle="Outsider role does not have clearance for the Ask Q&A feature."
        />
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-6 text-sm text-[#FB7185]">
          <p className="font-semibold">Forbidden</p>
          <p className="mt-1">
            As an outsider, you only have clearance for public claims. Handover Q&A requires an incoming, reviewer, leaver, or admin role.
          </p>
        </div>
      </AppShell>
    );
  }

  const isDemo = Boolean(user.isDemo);
  let projectName = "Campus Pay";
  let activeProjectId: string | undefined = undefined;

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      projectName = userProjects[0].name;
      activeProjectId = userProjects[0].id;
    } else {
      projectName = "Workspace";
    }
  }

  return (
    <AppShell
      user={user}
      section="Ask Baton"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / KNOWLEDGE Q&A`}
        title="Ask Baton"
        subtitle="Answers grounded in verified engineering claims and project architecture."
      />
      <AskClient projectId={activeProjectId} isDemo={isDemo} projectName={projectName} />
    </AppShell>
  );
}
