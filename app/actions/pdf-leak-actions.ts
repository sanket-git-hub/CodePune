"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { clearanceFor } from "@/lib/permissions";

export async function testPdfExportLeak(): Promise<{
  leaked: boolean;
  claimsCount: number;
  hiddenCount: number;
  textSnippet: string;
}> {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const clearance = clearanceFor(user.role);

  // Fetch claims that would be exported into the PDF
  const { rows } = await pool.query(
    `SELECT statement, excerpt
     FROM claims
     WHERE review_state = 'approved'
       AND access_tag = ANY($1::text[])`,
    [clearance]
  );

  const { rows: hiddenRows } = await pool.query(
    `SELECT count(*)::int AS count
     FROM claims
     WHERE review_state = 'approved'
       AND NOT (access_tag = ANY($1::text[]))`,
    [clearance]
  );

  const exportedText = rows.map((r) => `${r.statement} ${r.excerpt}`).join(" ");
  const markers = ["LEAKMARKER-HR-7731", "LEAKMARKER-FIN-4410"];
  const leaked = markers.some((m) => exportedText.includes(m));

  return {
    leaked,
    claimsCount: rows.length,
    hiddenCount: hiddenRows[0]?.count || 0,
    textSnippet: exportedText.slice(0, 200),
  };
}
