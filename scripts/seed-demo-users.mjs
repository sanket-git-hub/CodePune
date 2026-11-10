// Run: node --env-file=.env.local scripts/seed-demo-users.mjs
import pg from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !demoPassword) {
  console.error("Set DATABASE_URL and DEMO_PASSWORD in .env.local first.");
  process.exit(1);
}

const accounts = [
  ["Demo Reviewer", "reviewer@demo.byebyebrain.test", "reviewer"],
  ["Arjun (Demo Incoming)", "arjun@demo.byebyebrain.test", "incoming"],
  ["Demo Outsider", "outsider@demo.byebyebrain.test", "outsider"],
];

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
const hash = await bcrypt.hash(demoPassword, 10);

for (const [name, email, role] of accounts) {
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [name, email, hash, role]
  );
  console.log("Seeded", email, "as", role);
}
await pool.end();
