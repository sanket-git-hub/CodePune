import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getProjectAdminData, isUserProjectAdmin } from "@/lib/projects";
import { AdminMembersClient } from "./admin-members-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ProjectAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    notFound();
  }

  const user = await requireUser();

  const isAdmin = await isUserProjectAdmin(user.id, id, user.role);
  if (!isAdmin) {
    redirect(`/projects/${id}?error=unauthorized`);
  }

  const data = await getProjectAdminData(id);
  if (!data) {
    notFound();
  }

  return (
    <AppShell
      user={user}
      section="Project Settings"
      projectName={data.project.name}
      isDemo={false}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#A5A5C0] transition hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Project Workspace</span>
        </Link>
      </div>

      <PageHeader
        eyebrow={`${data.project.name.toUpperCase()} / ADMINISTRATION`}
        title="Project Settings & Members"
        subtitle="Manage teammates, send invitations, and track access for this workspace."
      />

      <div className="mt-8">
        <AdminMembersClient
          projectId={id}
          projectName={data.project.name}
          members={data.members}
          invitations={data.invitations}
        />
      </div>
    </AppShell>
  );
}
