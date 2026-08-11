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
  "../supabase/migrations/20260807000200_onet_30_0_career_value_profiles.sql",
  import.meta.url,
);

try {
  await pool.query(await readFile(migration, "utf8"));
  const result = await pool.query<{ count: number; invalid: number }>(`
    select count(*)::int as count,
      count(*) filter (where achievement < 0 or achievement > 1
        or independence < 0 or independence > 1 or recognition < 0 or recognition > 1
        or relationships < 0 or relationships > 1 or support < 0 or support > 1
        or working_conditions < 0 or working_conditions > 1)::int as invalid
    from knowledge.career_value_profiles
    where profile_version = 'onet-30.0-EX-normalized'
  `);
  console.table(result.rows);
  if (!result.rows[0]?.count || result.rows[0].invalid !== 0) {
    throw new Error("Career value-profile verification failed");
  }
} finally {
  await pool.end();
}
