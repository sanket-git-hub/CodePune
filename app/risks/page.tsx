import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import type { Person } from "@/lib/demo-data";

type RiskRow = {
  id: string;
  severity: "High" | "Medium" | "Low";
  risk: string;
  area: string;
  step: string;
  owner: Person;
};

const RISKS: RiskRow[] = [
  {
    id: "r1",
    severity: "High",
    risk: "Webhook failures can go unnoticed",
    area: "Payments",
    step: "Add failure alerts and a daily reconciliation job.",
    owner: "Aarav",
  },
  {
    id: "r2",
    severity: "High",
    risk: "Payments has no backup owner",
    area: "Ownership",
    step: "Pair Priya with Aarav and record a walkthrough.",
    owner: "Aarav",
  },
  {
    id: "r3",
    severity: "Medium",
    risk: "Refund launch blocked by legal",
    area: "Billing",
    step: "Follow up with legal on the updated policy.",
    owner: "Zoya",
  },
  {
    id: "r4",
    severity: "Medium",
    risk: "Production migration needs review",
    area: "Platform",
    step: "Schedule a peer review before deployment.",
    owner: "Meera",
  },
  {
    id: "r5",
    severity: "Low",
    risk: "API docs are out of date",
    area: "Documentation",
    step: "Update refund examples before release.",
    owner: "Kabir",
  },
];

export default async function RisksPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Risk register">
      <PageHeader
        title="Risk register"
        subtitle="See the plot twists before they happen."
      />

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold tracking-wider text-[#A5A5C0]">
                <th scope="col" className="px-6 py-4">
                  SEVERITY
                </th>
                <th scope="col" className="px-6 py-4">
                  RISK
                </th>
                <th scope="col" className="px-6 py-4">
                  AREA
                </th>
                <th scope="col" className="px-6 py-4">
                  SUGGESTED NEXT STEP
                </th>
                <th scope="col" className="px-6 py-4">
                  OWNER
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {RISKS.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    {r.severity === "High" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2.5 py-1 text-xs font-medium text-[#FB7185]">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]"
                          aria-hidden="true"
                        />
                        High
                      </span>
                    ) : r.severity === "Medium" ? (
                      <span className="inline-flex items-center rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
                        Medium
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 text-xs font-medium text-[#34D399]">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-[#F4F4FA]">
                    {r.risk}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-[#A5A5C0]">
                    {r.area}
                  </td>
                  <td className="px-6 py-4 text-[#A5A5C0]">{r.step}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.owner} size={24} />
                      <span className="text-[#F4F4FA]">{r.owner}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
