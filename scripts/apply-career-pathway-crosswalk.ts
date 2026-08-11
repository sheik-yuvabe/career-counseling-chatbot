import { readFile } from "node:fs/promises";
import { createDatabasePool } from "@yuvanext/database";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

const migration = new URL(
  "../supabase/migrations/20260806000100_tn_dce_career_pathway_crosswalk.sql",
  import.meta.url,
);

try {
  await pool.query(await readFile(migration, "utf8"));

  const verification = await pool.query<{
    pathways: number;
    career_mappings: number;
    discipline_mappings: number;
  }>(`
    select
      (select count(*)::int from knowledge.pathways
       where dataset_version_id = 'e5000000-0000-4000-8000-999999999992') as pathways,
      (select count(*)::int from knowledge.career_pathways cp
       join knowledge.pathways p on p.id = cp.pathway_id
       where p.dataset_version_id = 'e5000000-0000-4000-8000-999999999992') as career_mappings,
      (select count(*)::int from knowledge.pathway_disciplines pd
       join knowledge.pathways p on p.id = pd.pathway_id
       where p.dataset_version_id = 'e5000000-0000-4000-8000-999999999992') as discipline_mappings
  `);

  console.table(verification.rows);
  const result = verification.rows[0];
  if (
    result?.pathways !== 7 ||
    result.career_mappings !== 16 ||
    result.discipline_mappings !== 10
  ) {
    throw new Error("Career-pathway crosswalk verification failed");
  }
} finally {
  await pool.end();
}
