import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function run() {
  const sqlPath = path.resolve("C:/Users/Sanket/Desktop/HackPune/baton/migrations/001_project_invitations.sql");
  console.log("Applying migration:", sqlPath);
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration applied successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
