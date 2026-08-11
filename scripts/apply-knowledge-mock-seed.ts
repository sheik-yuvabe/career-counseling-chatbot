import { readFile } from "node:fs/promises";
import { createDatabasePool } from "@yuvanext/database";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = createDatabasePool({
  connectionString,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});

const migrationFile =
  process.argv[2] ?? "20260805000100_knowledge_mock_seed.sql";
if (
  !/^(?:20260805\d{6}_knowledge_mock_seed(?:_10_rows)?|20260805000300_realistic_knowledge_mock_data|20260805000400_onet_30_4_career_domains|20260805000600_tn_dce_official_colleges_aid)\.sql$/.test(
    migrationFile,
  )
) {
  throw new Error("Only the committed knowledge mock seed migrations may be applied");
}
const migrationUrl = new URL(`../supabase/migrations/${migrationFile}`, import.meta.url);

try {
  const sql = await readFile(migrationUrl, "utf8");
  await pool.query(sql);

  const verification = await pool.query<{ table_name: string; status: string }>(`
    select seeded.table_name,
           case when seeded.present then 'present' else 'missing' end as status
    from (values
      ('knowledge_sources', exists(select 1 from knowledge.knowledge_sources where id = 'f0000000-0000-4000-8000-000000000001')),
      ('dataset_versions', exists(select 1 from knowledge.dataset_versions where id = 'f0000000-0000-4000-8000-000000000002')),
      ('education_routes', exists(select 1 from knowledge.education_routes where id = 'f0000000-0000-4000-8000-000000000003')),
      ('careers', exists(select 1 from knowledge.careers where id = 'f0000000-0000-4000-8000-000000000004')),
      ('career_interest_profiles', exists(select 1 from knowledge.career_interest_profiles where career_id = 'f0000000-0000-4000-8000-000000000004')),
      ('career_value_profiles', exists(select 1 from knowledge.career_value_profiles where career_id = 'f0000000-0000-4000-8000-000000000004')),
      ('career_profiles', exists(select 1 from knowledge.career_profiles where career_id = 'f0000000-0000-4000-8000-000000000004')),
      ('pathways', exists(select 1 from knowledge.pathways where id = 'f0000000-0000-4000-8000-000000000005')),
      ('career_pathways', exists(select 1 from knowledge.career_pathways where career_id = 'f0000000-0000-4000-8000-000000000004' and pathway_id = 'f0000000-0000-4000-8000-000000000005')),
      ('stream_options', exists(select 1 from knowledge.stream_options where id = 'f0000000-0000-4000-8000-000000000006')),
      ('stream_maps', exists(select 1 from knowledge.stream_maps where id = 'f0000000-0000-4000-8000-000000000007')),
      ('stream_map_items', exists(select 1 from knowledge.stream_map_items where map_id = 'f0000000-0000-4000-8000-000000000007')),
      ('colleges', exists(select 1 from knowledge.colleges where id = 'f0000000-0000-4000-8000-000000000008')),
      ('disciplines', exists(select 1 from knowledge.disciplines where id = 'f0000000-0000-4000-8000-000000000009')),
      ('college_programs', exists(select 1 from knowledge.college_programs where id = 'f0000000-0000-4000-8000-00000000000a')),
      ('pathway_disciplines', exists(select 1 from knowledge.pathway_disciplines where pathway_id = 'f0000000-0000-4000-8000-000000000005' and discipline_id = 'f0000000-0000-4000-8000-000000000009')),
      ('aid_schemes', exists(select 1 from knowledge.aid_schemes where id = 'f0000000-0000-4000-8000-00000000000b')),
      ('aid_criteria', exists(select 1 from knowledge.aid_criteria where id = 'f0000000-0000-4000-8000-00000000000c'))
    ) as seeded(table_name, present)
    order by table_name
  `);

  const missing = verification.rows.filter((row) => row.status !== "present");
  console.table(verification.rows);
  if (missing.length > 0) {
    throw new Error(`${missing.length} knowledge mock rows are missing`);
  }

  const tables = verification.rows.map((row) => row.table_name);
  const counts: Array<{ table_name: string; row_count: number }> = [];
  for (const tableName of tables) {
    const result = await pool.query<{ row_count: number }>(
      `select count(*)::int as row_count from knowledge.${tableName}`,
    );
    counts.push({ table_name: tableName, row_count: result.rows[0]?.row_count ?? 0 });
  }
  console.table(counts);
  const underTen = counts.filter((row) => row.row_count < 10);
  if (underTen.length > 0) {
    throw new Error(`${underTen.length} knowledge tables contain fewer than 10 rows`);
  }
  console.log("Knowledge mock seed verified: all 18 tables contain at least 10 rows.");

  if (migrationFile === "20260805000400_onet_30_4_career_domains.sql") {
    const domains = await pool.query<{ domain_code: string; careers: number }>(`
      select domain_code, count(*)::int as careers
      from knowledge.careers
      where dataset_version_id = 'e4000000-0000-4000-8000-999999999992'
      group by domain_code
      order by domain_code
    `);
    const identifiers = await pool.query<{ total: number; with_nco: number }>(`
      select count(*)::int as total, count(nco_code)::int as with_nco
      from knowledge.careers
      where dataset_version_id = 'e4000000-0000-4000-8000-999999999992'
    `);
    console.table(domains.rows);
    console.table(identifiers.rows);
  }

  if (migrationFile === "20260805000600_tn_dce_official_colleges_aid.sql") {
    const officialRows = await pool.query<{
      dataset_key: string;
      table_name: string;
      row_count: number;
    }>(`
      select 'tn-dce-colleges-programmes' as dataset_key, 'colleges' as table_name,
             count(*)::int as row_count
      from knowledge.colleges
      where dataset_version_id = 'd1000000-0000-4000-8000-999999999993'
      union all
      select 'tn-dce-colleges-programmes', 'college_programs', count(*)::int
      from knowledge.college_programs
      where dataset_version_id = 'd1000000-0000-4000-8000-999999999993'
      union all
      select 'tn-dce-aid-schemes', 'aid_schemes', count(*)::int
      from knowledge.aid_schemes
      where dataset_version_id = 'd1000000-0000-4000-8000-999999999994'
      union all
      select 'tn-dce-aid-schemes', 'aid_criteria', count(*)::int
      from knowledge.aid_criteria criteria
      join knowledge.aid_schemes schemes on schemes.id = criteria.aid_scheme_id
      where schemes.dataset_version_id = 'd1000000-0000-4000-8000-999999999994'
      order by dataset_key, table_name
    `);
    console.table(officialRows.rows);

    if (officialRows.rows.some((row) => row.row_count !== 10)) {
      throw new Error("Official TNDCE dataset verification failed");
    }
  }
} finally {
  await pool.end().catch(() => undefined);
}
