import { resolve } from "node:path";
import { createDatabasePool } from "@yuvanext/database";

process.loadEnvFile(resolve(process.env.INIT_CWD ?? process.cwd(), ".env"));
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});
try {
  const result = await pool.query(`
    select map.top_two_code as "topTwo", map.segment,
      map.version as "mappingVersion",
      dataset.dataset_key as "datasetKey", dataset.version,
      source.source_type as "sourceType", source.trust_level as "trustLevel",
      count(item.stream_option_id)::int as choices
    from knowledge.stream_maps map
    join knowledge.dataset_versions dataset on dataset.id = map.dataset_version_id
    join knowledge.knowledge_sources source on source.id = dataset.source_id
    left join knowledge.stream_map_items item on item.map_id = map.id
    where map.status = 'published'
      and dataset.import_status = 'published'
    group by map.id, map.top_two_code, map.segment, map.version,
      dataset.dataset_key, dataset.version, source.source_type, source.trust_level
    order by map.segment, map.top_two_code, dataset.version desc
  `);
  console.table(result.rows);
} finally {
  await pool.end();
}
