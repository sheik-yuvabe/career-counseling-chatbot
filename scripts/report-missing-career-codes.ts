import { createDatabasePool } from "@yuvanext/database";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

try {
  const result = await pool.query<{
    id: string;
    title: string;
    slug: string;
    nco_code: string | null;
    dataset_key: string;
    source_key: string;
  }>(`
    select c.id, c.title, c.slug, c.nco_code, dv.dataset_key, ks.source_key
    from knowledge.careers c
    join knowledge.dataset_versions dv on dv.id = c.dataset_version_id
    join knowledge.knowledge_sources ks on ks.id = dv.source_id
    where c.onet_code is null
    order by dv.dataset_key, c.title
  `);
  console.table(result.rows);
  console.log(`Careers with missing O*NET codes: ${result.rowCount ?? 0}`);

  const references = await pool.query<{
    recommendation_item_id: string;
    career_id: string;
    entity_dataset_version: string;
    entity_snapshot_json: unknown;
  }>(`
    select ri.id as recommendation_item_id, ri.career_id,
           ri.entity_dataset_version, ri.entity_snapshot_json
    from recommendation.recommendation_items ri
    join knowledge.careers c on c.id = ri.career_id
    where c.onet_code is null
  `);
  console.table(references.rows);
  console.log(`Recommendation references to null-code careers: ${references.rowCount ?? 0}`);
} finally {
  await pool.end();
}
