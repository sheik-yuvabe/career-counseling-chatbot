import { readFile } from "node:fs/promises";
import { createDatabasePool } from "@yuvanext/database";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

const migration = new URL(
  "../supabase/migrations/20260805000500_remove_null_onet_synthetic_careers.sql",
  import.meta.url,
);

try {
  const before = await pool.query<{ missing_onet: number }>(
    "select count(*)::int as missing_onet from knowledge.careers where onet_code is null",
  );
  console.log(`Null-code careers before cleanup: ${before.rows[0]?.missing_onet ?? 0}`);

  await pool.query(await readFile(migration, "utf8"));

  const after = await pool.query<{
    total_careers: number;
    missing_onet: number;
    official_onet: number;
  }>(`
    select count(*)::int as total_careers,
           count(*) filter (where onet_code is null)::int as missing_onet,
           count(*) filter (where dataset_version_id = 'e4000000-0000-4000-8000-999999999992')::int as official_onet
    from knowledge.careers
  `);
  console.table(after.rows);
  if (after.rows[0]?.missing_onet !== 0 || after.rows[0]?.official_onet !== 32) {
    throw new Error("Post-cleanup career verification failed");
  }
} finally {
  await pool.end();
}
