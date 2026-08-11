import { resolve } from "node:path";
import { createDatabasePool } from "@yuvanext/database";
import { PostgresCollegeRepository } from "@yuvanext/knowledge";

process.loadEnvFile(resolve(process.env.INIT_CWD ?? process.cwd(), ".env"));
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = createDatabasePool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 1,
});
try {
  const result = await pool.query(`
    select college.dataset_version_id::text, dataset.dataset_key,
      dataset.version, count(*)::int as colleges
    from knowledge.colleges college
    join knowledge.dataset_versions dataset on dataset.id = college.dataset_version_id
    where college.verification_status = 'verified'
      and dataset.import_status = 'published'
      and lower(trim(college.state)) = lower('Tamil Nadu')
    group by college.dataset_version_id, dataset.dataset_key, dataset.version
    order by dataset.version
  `);
  console.table(result.rows);
  const colleges = await new PostgresCollegeRepository(pool).list({
    state: "Tamil Nadu",
    limit: 20,
  });
  console.table(colleges.map((college) => ({
    name: college.name,
    datasetVersionId: college.datasetVersionId,
  })));
  if (new Set(colleges.map((college) => college.datasetVersionId)).size > 1) {
    throw new Error("College endpoint still mixes dataset versions");
  }
  const disciplines = await pool.query(`
    select discipline.discipline_code, discipline.title,
      count(distinct program.college_id)::int as colleges
    from knowledge.disciplines discipline
    join knowledge.college_programs program
      on program.discipline_id = discipline.id
    join knowledge.colleges college on college.id = program.college_id
    where college.dataset_version_id = 'd1000000-0000-4000-8000-999999999993'
      and college.verification_status = 'verified'
      and program.verification_status = 'verified'
      and discipline.status = 'active'
    group by discipline.discipline_code, discipline.title
    order by discipline.title
  `);
  console.table(disciplines.rows);
} finally {
  await pool.end();
}
