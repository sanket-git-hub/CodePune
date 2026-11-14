import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AskClient } from "./ask-client";

export default async function AskPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/login");
  }

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
            As an outsider, you only have clearance for public claims. Handover Q&A requires an incoming, reviewer, leaver, or admin role on an approved handover.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Ask Baton">
      <PageHeader
        eyebrow="CAMPUS PAY / KNOWLEDGE Q&A"
        title="Ask Baton"
        subtitle="Answers grounded strictly in approved handover claims."
      />
      <AskClient />
    </AppShell>
  );
}
