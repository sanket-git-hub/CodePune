import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { HANDOVER } from "@/lib/demo-data";

export default async function BriefPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Handover brief">
      <PageHeader
        title="Handover brief"
        subtitle="A consolidated executive summary for your team handover."
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F4F4FA]">
              {HANDOVER.from} &rarr; {HANDOVER.to} Handover Packet
            </h2>
            <span className="rounded-md border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 text-xs text-[#34D399]">
              Ready for review
            </span>
          </div>
          <p className="mt-2 text-sm text-[#A5A5C0]">
            This brief aggregates all verified decisions, active work streams,
            critical dependencies, and ownership mappings for the incoming owner.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-[#A5A5C0]">Primary System</p>
              <p className="mt-1 font-semibold text-[#F4F4FA]">
                Campus Pay / Payments
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-[#A5A5C0]">Handover Status</p>
              <p className="mt-1 font-semibold text-[#F4F4FA]">72% Ready</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-[#A5A5C0]">Key Contact</p>
              <p className="mt-1 font-semibold text-[#F4F4FA]">{HANDOVER.from}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
