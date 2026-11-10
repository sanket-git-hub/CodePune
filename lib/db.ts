import { Pool } from "pg";
 
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
 
// Reuse one pool across hot reloads in dev so Neon connections are not exhausted.
const globalForPg = globalThis as unknown as { pgPool?: Pool };
 
export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 5,
  });
 
if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}