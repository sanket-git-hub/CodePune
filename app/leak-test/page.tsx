import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { LeakTestClient } from "./leak-test-client";
import { pool } from "@/lib/db";
import { clearanceFor } from "@/lib/permissions";

export default async function LeakTestPage() {
  const user = await requireUser();

  // Test markers from seed
  const markers = [
    { name: "HR Confidential Salary Marker", tag: "hr", marker: "LEAKMARKER-HR-7731" },
    { name: "Finance Client Sheet Marker", tag: "finance", marker: "LEAKMARKER-FIN-4410" },
  ];

  // Inspect database visibility for current user's role
  const clearance = clearanceFor(user.role);
  const { rows } = await pool.query(
    `SELECT count(*)::int AS count
     FROM chunks
     WHERE (content ILIKE '%LEAKMARKER%')
       AND access_tag = ANY($1::text[])`,
    [clearance]
  );

  const visibleMarkerChunks = rows[0]?.count || 0;

  return (
    <AppShell user={user} section="Leak test">
      <PageHeader
        eyebrow="SECURITY VERIFICATION"
        title="Permission & Leak Test"
        subtitle="Verify that lower roles cannot access planted confidential markers through direct queries or Ask Q&A."
      />
      <LeakTestClient
        userRole={user.role}
        clearance={clearance}
        visibleMarkerChunks={visibleMarkerChunks}
        markers={markers}
      />
    </AppShell>
  );
}
