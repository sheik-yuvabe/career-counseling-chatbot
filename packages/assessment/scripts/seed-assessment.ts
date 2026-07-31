import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(scriptDir, "../../../.env"),
  resolve(scriptDir, "../../.env"),
];
const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  process.loadEnvFile(envPath);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed assessment catalog data.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10_000,
});

type Scale = "R" | "I" | "A" | "S" | "E" | "C";

type SeedItem = {
  key: string;
  order: number;
  scale: Scale;
  prompt: string;
};

const instrument = {
  code: "mini_ip_30",
  name: "YuvaNext Mini Interest Profiler 30",
  construct: "interest",
  version: "1.0",
  language: "en",
  ageMin: 12,
  ageMax: 99,
  batchSize: 10,
  scoringAlgorithmVersion: "riasec-deterministic-v1",
  contentLicenseRef: "yuvanext-mock-content-v1",
  reviewStatus: "mock",
} as const;

const items: SeedItem[] = [
  {
    key: "r_build_fix_tools",
    order: 1,
    scale: "R",
    prompt: "I enjoy building, fixing, or working with tools and materials.",
  },
  {
    key: "i_solve_science_questions",
    order: 2,
    scale: "I",
    prompt: "I enjoy solving science, technology, or research-based questions.",
  },
  {
    key: "a_create_original_work",
    order: 3,
    scale: "A",
    prompt: "I enjoy creating original work such as art, writing, music, or design.",
  },
  {
    key: "s_help_people_learn",
    order: 4,
    scale: "S",
    prompt: "I enjoy helping people learn, understand, or feel supported.",
  },
  {
    key: "e_lead_people",
    order: 5,
    scale: "E",
    prompt: "I enjoy leading people, presenting ideas, or persuading others.",
  },
  {
    key: "c_organize_details",
    order: 6,
    scale: "C",
    prompt: "I enjoy organizing information, records, schedules, or details.",
  },
  {
    key: "r_work_outdoors",
    order: 7,
    scale: "R",
    prompt: "I like practical tasks that involve movement, machines, or outdoor work.",
  },
  {
    key: "i_analyze_data",
    order: 8,
    scale: "I",
    prompt: "I like analyzing data, patterns, problems, or why something works.",
  },
  {
    key: "a_express_ideas",
    order: 9,
    scale: "A",
    prompt: "I like expressing ideas in a visual, written, or performance style.",
  },
  {
    key: "s_listen_support",
    order: 10,
    scale: "S",
    prompt: "I like listening to others and helping them solve personal or learning problems.",
  },
  {
    key: "e_start_projects",
    order: 11,
    scale: "E",
    prompt: "I like starting projects, making decisions, and motivating a group.",
  },
  {
    key: "c_follow_process",
    order: 12,
    scale: "C",
    prompt: "I like following a clear process and completing tasks accurately.",
  },
  {
    key: "r_use_hands",
    order: 13,
    scale: "R",
    prompt: "I prefer tasks where I can use my hands and see a practical result.",
  },
  {
    key: "i_experiment",
    order: 14,
    scale: "I",
    prompt: "I enjoy experimenting, testing ideas, and learning from evidence.",
  },
  {
    key: "a_design_new_things",
    order: 15,
    scale: "A",
    prompt: "I enjoy designing new things, even when there is no single correct answer.",
  },
  {
    key: "s_teach_or_care",
    order: 16,
    scale: "S",
    prompt: "I enjoy teaching, caring, guiding, or working closely with people.",
  },
  {
    key: "e_sell_or_pitch",
    order: 17,
    scale: "E",
    prompt: "I enjoy selling, pitching, debating, or influencing decisions.",
  },
  {
    key: "c_manage_numbers",
    order: 18,
    scale: "C",
    prompt: "I enjoy working with numbers, forms, checklists, or structured data.",
  },
  {
    key: "r_repair_equipment",
    order: 19,
    scale: "R",
    prompt: "I would enjoy repairing equipment, assembling parts, or handling devices.",
  },
  {
    key: "i_deep_research",
    order: 20,
    scale: "I",
    prompt: "I would enjoy doing deep research before deciding on an answer.",
  },
  {
    key: "a_make_content",
    order: 21,
    scale: "A",
    prompt: "I would enjoy making content, visuals, stories, products, or experiences.",
  },
  {
    key: "s_community_work",
    order: 22,
    scale: "S",
    prompt: "I would enjoy working in education, health, counseling, or community support.",
  },
  {
    key: "e_business_action",
    order: 23,
    scale: "E",
    prompt: "I would enjoy business activities like planning, negotiating, or managing outcomes.",
  },
  {
    key: "c_quality_control",
    order: 24,
    scale: "C",
    prompt: "I would enjoy checking quality, improving accuracy, and keeping work on track.",
  },
  {
    key: "r_physical_systems",
    order: 25,
    scale: "R",
    prompt: "Careers involving machines, agriculture, construction, or physical systems interest me.",
  },
  {
    key: "i_technical_ideas",
    order: 26,
    scale: "I",
    prompt: "Careers involving investigation, coding, medicine, or technical ideas interest me.",
  },
  {
    key: "a_creative_fields",
    order: 27,
    scale: "A",
    prompt: "Careers involving design, media, language, or creative expression interest me.",
  },
  {
    key: "s_people_service",
    order: 28,
    scale: "S",
    prompt: "Careers involving teaching, social impact, service, or guidance interest me.",
  },
  {
    key: "e_enterprise",
    order: 29,
    scale: "E",
    prompt: "Careers involving entrepreneurship, leadership, sales, or public influence interest me.",
  },
  {
    key: "c_operations",
    order: 30,
    scale: "C",
    prompt: "Careers involving finance, administration, operations, or compliance interest me.",
  },
];

const client = await pool.connect();

try {
  await client.query("begin");

  const definitionResult = await client.query<{ id: string }>(
    `
      insert into assessment.assessment_definitions
        (id, instrument_code, name, construct, status, created_at)
      values
        (gen_random_uuid(), $1, $2, $3, 'active', now())
      on conflict (instrument_code) do update set
        name = excluded.name,
        construct = excluded.construct,
        status = excluded.status
      returning id
    `,
    [instrument.code, instrument.name, instrument.construct],
  );
  const definitionId = definitionResult.rows[0]?.id;
  if (!definitionId) {
    throw new Error("Assessment definition upsert returned no id.");
  }

  const versionResult = await client.query<{ id: string }>(
    `
      insert into assessment.assessment_versions
        (
          id, definition_id, version, language, age_min, age_max, item_count, batch_size,
          scoring_algorithm_version, content_license_ref, review_status, effective_from,
          retired_at, created_at
        )
      values
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() - interval '1 day', null, now())
      on conflict (definition_id, version) do update set
        language = excluded.language,
        age_min = excluded.age_min,
        age_max = excluded.age_max,
        item_count = excluded.item_count,
        batch_size = excluded.batch_size,
        scoring_algorithm_version = excluded.scoring_algorithm_version,
        content_license_ref = excluded.content_license_ref,
        review_status = excluded.review_status,
        effective_from = excluded.effective_from,
        retired_at = excluded.retired_at
      returning id
    `,
    [
      definitionId,
      instrument.version,
      instrument.language,
      instrument.ageMin,
      instrument.ageMax,
      items.length,
      instrument.batchSize,
      instrument.scoringAlgorithmVersion,
      instrument.contentLicenseRef,
      instrument.reviewStatus,
    ],
  );
  const versionId = versionResult.rows[0]?.id;
  if (!versionId) {
    throw new Error("Assessment version upsert returned no id.");
  }

  let insertedItems = 0;
  for (const item of items) {
    const existingItem = await client.query<{ id: string }>(
      `
        select id
        from assessment.assessment_items
        where assessment_version_id = $1 and item_key = $2
        limit 1
      `,
      [versionId, item.key],
    );
    if (existingItem.rowCount === 0) {
      await client.query(
        `
          insert into assessment.assessment_items
            (
              id, assessment_version_id, item_key, display_order, item_type, prompt_text,
              prompt_asset_ref, scale_code, is_reverse_scored, is_qc, qc_rule_json,
              is_tie_break, review_status, created_at
            )
          values
            (gen_random_uuid(), $1, $2, $3, 'likert', $4, null, $5, false, false, null, false, 'mock', now())
        `,
        [versionId, item.key, item.order, item.prompt, item.scale],
      );
      insertedItems += 1;
    }
  }

  await client.query("commit");

  const summary = await client.query(
    `
      select ad.instrument_code, av.version, av.language, av.age_min, av.age_max,
        av.review_status, av.item_count, count(ai.id)::int as stored_item_count
      from assessment.assessment_definitions ad
      join assessment.assessment_versions av on av.definition_id = ad.id
      left join assessment.assessment_items ai on ai.assessment_version_id = av.id
      where ad.instrument_code = $1
      group by ad.instrument_code, av.version, av.language, av.age_min, av.age_max, av.review_status, av.item_count
      order by av.version
    `,
    [instrument.code],
  );

  console.log(JSON.stringify({ insertedItems, summary: summary.rows }, null, 2));
} catch (error) {
  await client.query("rollback");
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
