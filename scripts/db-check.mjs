import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function main() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log("Current tables:", tables.rows.map((r) => r.table_name));

  const cols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='projects'"
  );
  console.log("Projects columns:", cols.rows);

  const projects = await pool.query("SELECT * FROM projects");
  console.log("Projects rows:", projects.rows);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
