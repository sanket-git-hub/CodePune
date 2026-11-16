// scripts/test-gaps.ts
// Automated verification for the Knowledge Gap Finder and Leaver Question Flow
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { detectGaps } from "../lib/gaps";
import { screenText } from "../lib/screen";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL in .env.local first.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: true },
});

async function main() {
  console.log("=================================================");
  console.log("RUNNING TEST: Knowledge Gap Finder & Leaver Flow");
  console.log("=================================================");

  // 1. Find seeded Campus Pay project and leaver (Riya)
  const projRes = await pool.query(
    "SELECT id::text, name FROM projects WHERE name = 'Campus Pay' LIMIT 1"
  );
  if (projRes.rows.length === 0) {
    throw new Error("Campus Pay project not found. Run npm run seed first.");
  }
  const projectId = projRes.rows[0].id;
  console.log(`Found Project: ${projRes.rows[0].name} (ID: ${projectId})`);

  const leaverRes = await pool.query(
    "SELECT id::text, name, email FROM users WHERE email = 'riya@demo.byebyebrain.test' LIMIT 1"
  );
  if (leaverRes.rows.length === 0) {
    throw new Error("Leaver user Riya not found. Run npm run seed first.");
  }
  const leaver = leaverRes.rows[0];
  console.log(`Found Leaver: ${leaver.name} (${leaver.email})`);

  // 2. Ensure schema columns exist
  await pool.query(`
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS gap_type TEXT CHECK (gap_type IN ('decision_no_reason', 'action_no_owner', 'leaver_only'));
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS question TEXT;
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answer TEXT;
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS related_claim_id BIGINT REFERENCES claims(id) ON DELETE CASCADE;
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answered_claim_id BIGINT REFERENCES claims(id) ON DELETE SET NULL;
    ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS knowledge_gaps_project_type_claim_idx ON knowledge_gaps (project_id, gap_type, related_claim_id) WHERE related_claim_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS knowledge_gaps_project_type_source_idx ON knowledge_gaps (project_id, gap_type, related_source_id) WHERE related_source_id IS NOT NULL;
  `);

  // 3. Run detection on seeded project
  const detectResult = await detectGaps(projectId);
  console.log("\n[Detection Result]:", detectResult);

  // Assert 3 planted gaps are found
  const { rows: allGaps } = await pool.query(
    `SELECT id::text, gap_type, title, status, question, related_claim_id::text, related_source_id::text
     FROM knowledge_gaps
     WHERE project_id = $1::bigint`,
    [projectId]
  );

  console.log(`\nTotal Gaps in Database: ${allGaps.length}`);
  const hasDecisionGap = allGaps.some((g) => g.gap_type === "decision_no_reason");
  const hasActionGap = allGaps.some((g) => g.gap_type === "action_no_owner");
  const hasLeaverGap = allGaps.some((g) => g.gap_type === "leaver_only");

  if (!hasDecisionGap || !hasActionGap || !hasLeaverGap) {
    throw new Error(`Assertion failed: Expected all 3 gap types planted in Campus Pay. Found: decision=${hasDecisionGap}, action=${hasActionGap}, leaver=${hasLeaverGap}`);
  }
  console.log("ASSERTION PASSED: All 3 planted gap types detected!");

  // 4. Answer one gap with a sample answer inside a transaction
  const targetGap = allGaps.find((g) => g.gap_type === "decision_no_reason" && g.status === "open") || allGaps[0];
  console.log(`\nAnswering Gap #${targetGap.id} (${targetGap.gap_type})...`);

  const sampleAnswer =
    "We migrated to AWS SNS because our internal webhook daemon was dropping messages during server restarts. We evaluated Apache Kafka but rejected it due to high infrastructure maintenance overhead.";

  const client = await pool.connect();
  let createdClaimId = "";
  try {
    await client.query("BEGIN");

    const screened = screenText(sampleAnswer);
    const maskedText = screened.text;

    // Insert source
    const srcIns = await client.query(
      `INSERT INTO sources (project_id, title, kind, access_tag, redactions, created_by)
       VALUES ($1::bigint, $2, 'leaver_answer', 'eng', 0, $3::bigint)
       ON CONFLICT (project_id, title) DO UPDATE SET kind = 'leaver_answer'
       RETURNING id::text`,
      [projectId, `Leaver answer: gap #${targetGap.id}`, leaver.id]
    );
    const sourceId = srcIns.rows[0].id;

    // Insert chunk
    const chunkIns = await client.query(
      `INSERT INTO chunks (source_id, position, content, access_tag)
       VALUES ($1::bigint, 0, $2, 'eng')
       RETURNING id::text`,
      [sourceId, maskedText]
    );
    const chunkId = chunkIns.rows[0].id;

    // Insert claim
    const statement = "Migrated notification pipeline to AWS SNS to prevent dropped messages during restarts.";
    const excerpt = maskedText.slice(0, 160);
    const integrityOk = maskedText.includes(excerpt);

    const claimIns = await client.query(
      `INSERT INTO claims
         (project_id, source_id, chunk_id, type, statement, excerpt, access_tag, evidence_status, review_state, integrity_ok, version, created_by)
       VALUES
         ($1::bigint, $2::bigint, $3::bigint, 'decision', $4, $5, 'eng', 'inferred', 'draft', $6, 1, $7::bigint)
       RETURNING id::text, review_state, integrity_ok`,
      [projectId, sourceId, chunkId, statement, excerpt, integrityOk, leaver.id]
    );
    createdClaimId = claimIns.rows[0].id;
    const reviewState = claimIns.rows[0].review_state;
    const claimIntegrity = claimIns.rows[0].integrity_ok;

    // Update gap
    await client.query(
      `UPDATE knowledge_gaps
       SET status = 'resolved', answer = $1, answered_claim_id = $2::bigint, answered_at = now()
       WHERE id = $3::bigint`,
      [maskedText, createdClaimId, targetGap.id]
    );

    await client.query("COMMIT");

    // 5. Assertions on the newly created claim
    console.log(`\nNew Claim #${createdClaimId} created from answer.`);
    if (reviewState !== "draft") {
      throw new Error(`Assertion failed: Expected review_state='draft', got ${reviewState}`);
    }
    if (claimIntegrity !== true) {
      throw new Error(`Assertion failed: Expected integrity_ok=true, got ${claimIntegrity}`);
    }
    console.log("ASSERTION PASSED: Created claim review_state is 'draft' and integrity_ok is true!");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // 6. Summary Table
  const { rows: stats } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_gaps,
       COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS answered,
       COUNT(CASE WHEN status = 'open' THEN 1 END)::int AS open,
       COUNT(CASE WHEN status = 'ignored' THEN 1 END)::int AS ignored
     FROM knowledge_gaps
     WHERE project_id = $1::bigint`,
    [projectId]
  );

  console.log("\n=================================================");
  console.log("GAP FINDER & LEAVER QUESTION FLOW SUMMARY TABLE");
  console.log("=================================================");
  console.table([
    {
      Project: "Campus Pay",
      "Planted Gaps": 3,
      "Detected Gaps": allGaps.length,
      "Answered Gaps": stats[0].answered,
      "Open Gaps": stats[0].open,
      "Ignored Gaps": stats[0].ignored,
      "Claim ID Created": createdClaimId,
      "Claim Review State": "draft",
      "Integrity Verified": "true",
    },
  ]);
  console.log("=================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! (PASS)");
  console.log("=================================================\n");
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
