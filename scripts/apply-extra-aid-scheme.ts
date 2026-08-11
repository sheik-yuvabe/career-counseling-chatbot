import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDatabasePool } from "@yuvanext/database";

process.loadEnvFile(resolve(process.env.INIT_CWD ?? process.cwd(), ".env"));
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

const migration = new URL(
  "../supabase/migrations/20260807000100_add_chief_minister_research_fellowship.sql",
  import.meta.url,
);

try {
  await pool.query(await readFile(migration, "utf8"));
  const verification = await pool.query<{
    aid_code: string;
    name: string;
    level: string;
    verification_status: string;
  }>(`
    select aid_code, name, level, verification_status
    from knowledge.aid_schemes
    where aid_code = 'TN-DCE-16'
  `);
  console.table(verification.rows);
  if (verification.rows.length !== 1) {
    throw new Error("Extra aid-scheme verification failed");
  }
} finally {
  await pool.end();
}
