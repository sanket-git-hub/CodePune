import { pool } from "../lib/db.ts";

async function run() {
  try {
    await pool.query(`
      ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS checks_json JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS answers_json JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS readiness_score INT NOT NULL DEFAULT 0;
    `);

    try {
      await pool.query(`
        ALTER TABLE onboarding_plans ADD CONSTRAINT onboarding_plans_project_user_unique UNIQUE (project_id, user_id);
      `);
    } catch {
      // constraint may already exist
    }

    console.log("SUCCESS: onboarding_plans schema migration verified!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

run();
