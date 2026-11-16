import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { detectStale, detectContradictions } from "../lib/conflicts";
import fs from "fs";
import path from "path";

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
  console.log("RUNNING TEST: Conflict & Stale-Work Finder");
  console.log("=================================================");

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS claim_conflicts (
      id            BIGSERIAL PRIMARY KEY,
      project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL CHECK (kind IN ('contradiction', 'stale')),
      claim_a_id    BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      claim_b_id    BIGINT REFERENCES claims(id) ON DELETE CASCADE,
      reason        TEXT NOT NULL,
      detected_by   TEXT NOT NULL DEFAULT 'rule' CHECK (detected_by IN ('rule', 'gemini')),
      status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
      resolution    TEXT CHECK (resolution IN ('keep_a', 'keep_b', 'both_valid', 'dismiss')),
      resolution_note TEXT,
      resolved_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
      resolved_at   TIMESTAMPTZ,
      is_planted    BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS claim_conflicts_contradiction_pair_idx 
    ON claim_conflicts (project_id, LEAST(claim_a_id, claim_b_id), GREATEST(claim_a_id, claim_b_id))
    WHERE kind = 'contradiction' AND claim_b_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS claim_conflicts_stale_claim_idx 
    ON claim_conflicts (project_id, claim_a_id)
    WHERE kind = 'stale';
  `);

  const projRes = await pool.query(
    "SELECT id::text, name FROM projects WHERE name = 'Campus Pay' LIMIT 1"
  );
  if (projRes.rows.length === 0) {
    throw new Error("Campus Pay project not found. Run npm run seed first.");
  }
  const projectId = projRes.rows[0].id;
  console.log(`Found Project: ${projRes.rows[0].name} (ID: ${projectId})`);

  // 1. Run detection
  console.log("\nRunning detectStale and detectContradictions...");
  const [staleRes, contraRes] = await Promise.all([
    detectStale(projectId, "admin"),
    detectContradictions(projectId, "admin"),
  ]);

  console.log("Stale detection count:", staleRes.staleCount);
  console.log("Contradiction detection count:", contraRes.contradictionsCount);
  console.log("Detected by Rule:", contraRes.detectedByRule);
  console.log("Detected by Gemini:", contraRes.detectedByGemini);

  // 2. Identify and flag planted contradictions by matching known statements
  const plantedStatements = [
    ["Use Razorpay for campus vendor payouts [Demo data]", "Switched to Cashfree instead of Razorpay for vendor payouts [Demo data]"],
    ["Connect directly to PostgreSQL without pooling [Demo data]", "No longer connect directly to PostgreSQL, replaced with PgBouncer connection pooling [Demo data]"],
    ["Webhook retries are enabled on HTTP 500 responses [Demo data]", "Webhook retries are disabled on HTTP 500 responses to prevent queue flooding [Demo data]"],
    ["Store session tokens in localStorage instead of cookies [Demo data]", "Cancelled localStorage token storage, switched to secure HTTP-only cookies [Demo data]"]
  ];

  // Flag planted items in DB
  for (const [stA, stB] of plantedStatements) {
    await pool.query(
      `UPDATE claim_conflicts cc
       SET is_planted = true
       FROM claims ca, claims cb
       WHERE cc.project_id = $1::bigint
         AND cc.kind = 'contradiction'
         AND cc.claim_a_id = ca.id AND cc.claim_b_id = cb.id
         AND (
           (ca.statement ILIKE ('%' || $2 || '%') AND cb.statement ILIKE ('%' || $3 || '%'))
           OR
           (ca.statement ILIKE ('%' || $3 || '%') AND cb.statement ILIKE ('%' || $2 || '%'))
         )`,
      [projectId, stA, stB]
    );
  }

  // Also flag planted stale claim
  await pool.query(
    `UPDATE claim_conflicts cc
     SET is_planted = true
     FROM claims ca
     WHERE cc.project_id = $1::bigint
       AND cc.kind = 'stale'
       AND cc.claim_a_id = ca.id
       AND ca.statement ILIKE '%bullmq in progress%'`,
    [projectId]
  );

  // 3. Query all conflicts to compute stats
  const { rows: allConflicts } = await pool.query(
    `SELECT cc.id, cc.kind, cc.detected_by, cc.is_planted, cc.reason,
            ca.statement AS a_statement, cb.statement AS b_statement
     FROM claim_conflicts cc
     JOIN claims ca ON cc.claim_a_id = ca.id
     LEFT JOIN claims cb ON cc.claim_b_id = cb.id
     WHERE cc.project_id = $1::bigint`,
    [projectId]
  );

  const plantedDetectedCount = allConflicts.filter((c) => c.kind === "contradiction" && c.is_planted).length;
  const totalContradictionsDetected = allConflicts.filter((c) => c.kind === "contradiction").length;
  const falsePositives = allConflicts.filter((c) => c.kind === "contradiction" && !c.is_planted).length;
  const missedPlanted = Math.max(0, 4 - plantedDetectedCount);
  const staleDetected = allConflicts.filter((c) => c.kind === "stale").length;

  // 4. Print Summary Table
  console.log("\n=================================================");
  console.log("CONFLICT & STALE WORK DETECTION SUMMARY TABLE");
  console.log("=================================================");
  const summaryData = [
    {
      Project: "Campus Pay",
      "Planted Contradictions": 4,
      "Detected Contradictions": totalContradictionsDetected,
      "Missed Planted": missedPlanted,
      "False Positives": falsePositives,
      "Stale Work Detected": staleDetected,
      "Planted Verification": plantedDetectedCount >= 4 ? "100% Detected (PASS)" : `${plantedDetectedCount}/4 Detected`,
    },
  ];
  console.table(summaryData);
  console.log("=================================================");

  // 5. Save results to docs/test-results.md
  const docsDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const markdownContent = `# Conflict and Stale-Work Finder Test Results

*Generated on:* ${new Date().toISOString()}  
*Project:* Campus Pay  

## Detection Statistics

| Metric | Count | Details |
| --- | --- | --- |
| **Planted Contradictions** | 4 | Injected opposite decisions and reversals |
| **Detected Contradictions** | ${totalContradictionsDetected} | Evaluated through rule and Gemini verification |
| **Missed Contradictions** | ${missedPlanted} | Expected 0 |
| **False Positives** | ${falsePositives} | Non-contradictory near-miss pairs flagged |
| **Stale Work Detected** | ${staleDetected} | In-progress claims unupdated for >14 days |

## Detected Contradiction Details

${allConflicts
  .filter((c) => c.kind === "contradiction")
  .map(
    (c, i) => `### ${i + 1}. [${c.detected_by.toUpperCase()}] ${c.reason}
- **Claim A:** ${c.a_statement}
- **Claim B:** ${c.b_statement}
- **Planted Ground Truth:** ${c.is_planted ? "Yes" : "No"}
`
  )
  .join("\n")}

## Stale Items

${allConflicts
  .filter((c) => c.kind === "stale")
  .map((c, i) => `- **Item ${i + 1}:** ${c.a_statement} (${c.reason})`)
  .join("\n")}
`;

  fs.writeFileSync(path.join(docsDir, "test-results.md"), markdownContent, "utf8");
  console.log(`Saved report to docs/test-results.md`);
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!\n");
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
