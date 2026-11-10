import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DECISIONS } from "@/lib/demo-data";
import { DecisionList } from "./decision-list";

export default async function DecisionsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Decisions">
      <PageHeader
        title="Decisions"
        subtitle="The what, the why, and the roads not taken."
        action={
          <Link
            href="/capture"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20"
          >
            <Plus size={16} aria-hidden="true" /> Add decision
          </Link>
        }
      />
      <DecisionList decisions={DECISIONS} />
    </AppShell>
  );
}
