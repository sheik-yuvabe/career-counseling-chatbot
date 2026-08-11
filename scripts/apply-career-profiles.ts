import { readFile } from "node:fs/promises";
import { createDatabasePool } from "@yuvanext/database";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

const migration = new URL(
  "../supabase/migrations/20260806000200_onet_30_3_career_profiles.sql",
  import.meta.url,
);

try {
  await pool.query(await readFile(migration, "utf8"));
  const verification = await pool.query<{
    reviewed_profiles: number;
    profiles_with_five_skills: number;
    unsupported_salary_rows: number;
  }>(`
    select
      count(*) filter (where profile.review_status = 'reviewed')::int as reviewed_profiles,
      count(*) filter (where cardinality(profile.skills) = 5)::int as profiles_with_five_skills,
      count(*) filter (where profile.salary_entry_band is not null)::int as unsupported_salary_rows
    from knowledge.career_profiles profile
    join knowledge.careers career on career.id = profile.career_id
    where career.onet_code is not null
      and career.onet_code not in ('15-2051.00', '13-2051.00')
  `);
  console.table(verification.rows);
  const result = verification.rows[0];
  if (
    result?.reviewed_profiles !== 30 ||
    result.profiles_with_five_skills !== 30 ||
    result.unsupported_salary_rows !== 0
  ) {
    throw new Error("Career profile verification failed");
  }
} finally {
  await pool.end();
}
