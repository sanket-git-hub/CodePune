import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { OWNERSHIP } from "@/lib/demo-data-extra";

export default async function OwnershipPage() {
  const user = await requireUser();
  const noBackup = OWNERSHIP.filter((a) => !a.backup).length;

  return (
    <AppShell user={user} section="Ownership map">
      <PageHeader
        title="Ownership map"
        subtitle="The right context, from the right people."
      />

      {noBackup > 0 && (
        <p className="mb-5 text-sm text-[#F59E0B]" role="status">
          {noBackup} {noBackup === 1 ? "area has" : "areas have"} no backup
          owner.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OWNERSHIP.map((a) => (
          <li
            key={a.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-[#6366F1]/40"
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Avatar name={a.owner} size={36} />
              <div>
                <h2 className="font-semibold">{a.area}</h2>
                <p className="text-sm text-[#A5A5C0]">
                  {a.owner} · Primary owner
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-[#A5A5C0]">Backup owner</p>
            {a.backup ? (
              <span className="mt-2 inline-block rounded-md border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 text-sm text-[#34D399]">
                {a.backup}
              </span>
            ) : (
              <>
                <span className="mt-2 inline-block rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2.5 py-1 text-sm text-[#FB7185]">
                  No backup
                </span>
                <p className="mt-3 text-sm text-[#A5A5C0]">
                  Single point of failure. Schedule a knowledge transfer.
                </p>
              </>
            )}

            <p className="mt-4 text-sm text-[#A5A5C0]">Ask them about</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
