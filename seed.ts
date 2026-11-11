// Run: npx tsx seed.ts   (needs schema.sql applied, DATABASE_URL, DEMO_PASSWORD in .env.local)
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { screenText } from "./lib/screen";

const url = process.env.DATABASE_URL;
const demoPassword = process.env.DEMO_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!url || !demoPassword) {
  console.error("Set DATABASE_URL and DEMO_PASSWORD in .env.local first.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: true },
});

type Tag = "public" | "eng" | "hr" | "finance";

// Emails match lib/demo.ts so the demo login buttons work.
const USERS = [
  {
    name: "Riya (Leaver)",
    email: "riya@demo.byebyebrain.test",
    role: "leaver",
    pw: demoPassword,
  },
  {
    name: "Arjun (Demo Incoming)",
    email: "arjun@demo.byebyebrain.test",
    role: "incoming",
    pw: demoPassword,
  },
  {
    name: "Karan (Demo Reviewer)",
    email: "reviewer@demo.byebyebrain.test",
    role: "reviewer",
    pw: demoPassword,
  },
  {
    name: "Admin",
    email: "admin@demo.byebyebrain.test",
    role: "admin",
    pw: adminPassword,
  },
  {
    name: "Guest (Demo Outsider)",
    email: "outsider@demo.byebyebrain.test",
    role: "outsider",
    pw: demoPassword,
  },
] as const;

// Fixtures contain FAKE secrets on purpose. They are screened before saving, like a real import.
const SOURCES: {
  title: string;
  kind: "text" | "csv";
  tag: Tag;
  body: string;
}[] = [
  {
    title: "Public PR #42 thread",
    kind: "text",
    tag: "public",
    body: `PR #42: Retry failed payment webhooks.

Riya: Failed webhooks silently dropped 40 orders in June. This PR adds retries with exponential backoff.

Reviewer: Approved. Monitoring for repeated failures is still missing and should follow.`,
  },
  {
    title: "Eng design note: Campus Pay payments",
    kind: "text",
    tag: "eng",
    body: `Decision: We chose Stripe over Razorpay and PayU because of better documentation and faster onboarding.

Decision: Refunds ship after legal approves the updated refund policy.

Risk: Payments has a single owner (Riya) and no backup owner.

Next action: Arjun adds webhook failure alerts and a daily reconciliation job.`,
  },
  {
    title: "Eng deploy-keys chat",
    kind: "text",
    tag: "eng",
    body: `Riya: staging deploy key is api_key = FAKE-0000-1111-2222-3333, rotate it after handover.

Riya: if production is down call Karan on +91 98765 43210.

Karan: ok, I will also move the key to the secrets manager.`,
  },
  {
    title: "HR salary thread",
    kind: "text",
    tag: "hr",
    body: `HR: Salary revision for the payments team is confidential. LEAKMARKER-HR-7731

HR: Do not share the revised bands outside HR and finance.`,
  },
  {
    title: "Finance client sheet",
    kind: "csv",
    tag: "finance",
    body: `client,plan,monthly_value
Northwind,Pro,LEAKMARKER-FIN-4410
Contoso,Starter,1200
Fabrikam,Pro,3400`,
  },
];

function chunkify(body: string, kind: "text" | "csv"): string[] {
  const parts =
    kind === "csv" ? body.split(/\r?\n/).slice(1) : body.split(/\n{2,}/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ids: Record<string, string> = {};
    for (const u of USERS) {
      if (!u.pw) {
        console.warn(
          `Skipped ${u.email}: set ADMIN_PASSWORD in .env.local to seed the admin.`,
        );
        continue;
      }
      const hash = await bcrypt.hash(u.pw, 10);
      const r = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
         RETURNING id::text`,
        [u.name, u.email, hash, u.role],
      );
      ids[u.role] = r.rows[0].id;
    }

    const proj = await client.query(
      `INSERT INTO projects (name) VALUES ('Campus Pay')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id::text`,
    );
    const projectId = proj.rows[0].id as string;

    for (const s of SOURCES) {
      const chunks = chunkify(s.body, s.kind).map((c) => screenText(c));
      const redactions = chunks.reduce((n, c) => n + c.count, 0);

      const src = await client.query(
        `INSERT INTO sources (project_id, title, kind, access_tag, redactions, created_by)
         VALUES ($1::bigint,$2,$3,$4,$5,$6::bigint)
         ON CONFLICT (project_id, title) DO UPDATE
           SET kind = EXCLUDED.kind, access_tag = EXCLUDED.access_tag, redactions = EXCLUDED.redactions
         RETURNING id::text`,
        [projectId, s.title, s.kind, s.tag, redactions, ids.reviewer ?? null],
      );
      const sourceId = src.rows[0].id as string;

      // Re-seeding replaces chunks instead of duplicating them.
      await client.query("DELETE FROM chunks WHERE source_id = $1::bigint", [
        sourceId,
      ]);
      for (const [i, c] of chunks.entries()) {
        await client.query(
          `INSERT INTO chunks (source_id, position, content, access_tag)
           VALUES ($1::bigint,$2,$3,$4)`,
          [sourceId, i, c.text, s.tag], // chunk tag = its source's tag
        );
      }
      console.log(
        `${s.title}: ${chunks.length} chunks, ${redactions} masked, tag ${s.tag}`,
      );
    }

    await client.query(
      `INSERT INTO handovers (project_id, leaver_id, incoming_id)
       SELECT $1::bigint, $2::bigint, $3::bigint
       WHERE NOT EXISTS (SELECT 1 FROM handovers WHERE project_id = $1::bigint)`,
      [projectId, ids.leaver, ids.incoming],
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
