import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function run() {
  const sql = fs.readFileSync("C:/Users/Sanket/Desktop/HackPune/baton/migrations/complete_schema.sql", "utf-8");
  console.log("Applying complete schema to Neon PostgreSQL...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Complete schema applied successfully!");

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log("All tables in Neon:", tables.rows.map(r => r.table_name));
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Schema application failed:", e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
