import Link from "next/link";
import { Plus, ShieldAlert, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import type { Person } from "@/lib/demo-data";
import { listUserProjects } from "@/lib/projects";
import { pool } from "@/lib/db";

type RiskRow = {
  id: string;
  severity: "High" | "Medium" | "Low";
  risk: string;
  area: string;
  step: string;
  owner: string;
};

const DEMO_RISKS: RiskRow[] = [
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
    risk: "API error responses lack single format",
    area: "API",
    step: "Adopt the proposed error-envelope RFC.",
    owner: "Kabir",
  },
];

export default async function RisksPage() {
  const user = await requireUser();
  const isDemo = Boolean(user.isDemo);

  let risks: RiskRow[] = DEMO_RISKS;
  let projectName = "Campus Pay";

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      const activeProj = userProjects[0];
      projectName = activeProj.name;

      const { rows } = await pool.query(
        `SELECT c.id::text, c.statement AS risk, c.excerpt AS step,
                c.access_tag AS area,
                COALESCE(u.name, 'Unassigned') AS owner,
                'Medium' AS severity
         FROM claims c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.project_id = $1::bigint AND c.type = 'risk'
         ORDER BY c.created_at DESC`,
        [activeProj.id]
      );

      risks = rows.map((r) => ({
        id: r.id,
        severity: "Medium",
        risk: r.risk,
        area: (r.area || "general").toUpperCase(),
        step: r.step || "Requires review during handover.",
        owner: r.owner,
      }));
    } else {
      risks = [];
      projectName = "Workspace";
    }
  }

  return (
    <AppShell
      user={user}
      section="Audit"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / RISKS`}
        title="Risks"
        subtitle="Uncertainty made visible before it becomes an incident."
      />

      {risks.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                  <th className="py-4 pl-6 pr-4">Severity</th>
                  <th className="px-4 py-4">Risk</th>
                  <th className="px-4 py-4">Area</th>
                  <th className="px-4 py-4">Next Step</th>
                  <th className="py-4 pl-4 pr-6">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {risks.map((r) => (
                  <tr key={r.id} className="transition hover:bg-white/[0.02]">
                    <td className="py-4 pl-6 pr-4">
                      <span
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                          r.severity === "High"
                            ? "border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#FB7185]"
                            : r.severity === "Medium"
                            ? "border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "border border-white/15 bg-white/5 text-[#A5A5C0]"
                        }`}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-white">{r.risk}</td>
                    <td className="px-4 py-4 text-xs text-[#C4B5FD]">{r.area}</td>
                    <td className="max-w-md px-4 py-4 text-xs text-[#A5A5C0]">{r.step}</td>
                    <td className="py-4 pl-4 pr-6">
                      <div className="flex items-center gap-2 text-xs text-white">
                        <Avatar name={r.owner} size={24} />
                        <span>{r.owner}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <ShieldAlert size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No risks identified yet for {projectName}
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            Import architecture notes or incident logs to uncover single-owner dependencies, unmitigated outages, or compliance gaps.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/capture"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              Import Knowledge
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
