import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

const RISKS = [
  {
    id: "r1",
    title: "Payments has no backup owner",
    severity: "High",
    tag: "Payments",
    description:
      "Payments currently has a single owner (Aarav). If an incident occurs during the handover, there is no secondary on-call.",
    status: "Unmitigated",
  },
  {
    id: "r2",
    title: "Silent webhook failures",
    severity: "High",
    tag: "Reliability",
    description:
      "Retries were added after 40 dropped orders, but automated alerts on dead-letter queues are not yet configured.",
    status: "In progress",
  },
  {
    id: "r3",
    title: "Refund flow blocked on legal review",
    severity: "Medium",
    tag: "Legal",
    description:
      "The refund flow draft is 70% complete in the payments repository pending legal policy signoff.",
    status: "Blocked",
  },
  {
    id: "r4",
    title: "Staging deploy credentials rotation",
    severity: "Medium",
    tag: "Security",
    description:
      "Staging deploy credentials need rotation following team handover.",
    status: "Pending",
  },
  {
    id: "r5",
    title: "Billing migration reconciliation job missing",
    severity: "Low",
    tag: "Billing",
    description:
      "Daily reconciliation script between Stripe invoices and local database state needs review.",
    status: "Not started",
  },
];

export default async function RisksPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Risk register">
      <PageHeader
        title="Risk register"
        subtitle="Uncover risks and blind spots before they become incidents."
      />

      <div className="grid gap-4">
        {RISKS.map((risk) => (
          <div
            key={risk.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#6366F1]/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                    risk.severity === "High"
                      ? "border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#FB7185]"
                      : risk.severity === "Medium"
                        ? "border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border border-white/10 bg-white/5 text-[#A5A5C0]"
                  }`}
                >
                  <AlertTriangle size={12} />
                  {risk.severity} priority
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#A5A5C0]">
                  {risk.tag}
                </span>
              </div>
              <span className="text-xs text-[#A5A5C0]">{risk.status}</span>
            </div>

            <h2 className="mt-3 text-base font-semibold text-[#F4F4FA]">
              {risk.title}
            </h2>
            <p className="mt-1 text-sm text-[#A5A5C0]">{risk.description}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
