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
  throw new Error("DATABASE_URL is required to seed WIP assessment catalog data.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10_000,
});

type WorkValueScale =
  | "achievement"
  | "independence"
  | "recognition"
  | "relationships"
  | "support"
  | "working_conditions";

type SeedItem = {
  key: string;
  order: number;
  scale: WorkValueScale;
  prompt: string;
};

const instrument = {
  code: "wip",
  name: "YuvaNext Work Importance Profiler",
  construct: "work_values",
  version: "1.0",
  language: "en",
  ageMin: 12,
  ageMax: 99,
  batchSize: 10,
  scoringAlgorithmVersion: "wip-deterministic-v1",
  contentLicenseRef: "yuvanext-mock-content-v1",
  reviewStatus: "mock",
} as const;

const items: SeedItem[] = [
  { key: "achievement_01_challenging_goals", order: 1, scale: "achievement", prompt: "I want work where I can set challenging goals and improve over time." },
  { key: "independence_01_choose_methods", order: 2, scale: "independence", prompt: "I want freedom to choose how I solve problems." },
  { key: "recognition_01_visible_success", order: 3, scale: "recognition", prompt: "I want my good work to be noticed and appreciated." },
  { key: "relationships_01_helpful_team", order: 4, scale: "relationships", prompt: "I want to work with people who support and respect each other." },
  { key: "support_01_clear_guidance", order: 5, scale: "support", prompt: "I want clear guidance from teachers, mentors, or managers." },
  { key: "working_conditions_01_stable_safe", order: 6, scale: "working_conditions", prompt: "I want work that feels stable, safe, and well organized." },
  { key: "achievement_02_use_abilities", order: 7, scale: "achievement", prompt: "I want work where I can use my strongest abilities." },
  { key: "independence_02_own_decisions", order: 8, scale: "independence", prompt: "I want chances to make decisions on my own." },
  { key: "recognition_02_growth_status", order: 9, scale: "recognition", prompt: "I want a career where progress and status are visible." },
  { key: "relationships_02_serve_people", order: 10, scale: "relationships", prompt: "I want my work to help people directly." },
  { key: "support_02_fair_leaders", order: 11, scale: "support", prompt: "I want fair leaders who give useful feedback." },
  { key: "working_conditions_02_balance", order: 12, scale: "working_conditions", prompt: "I want a healthy balance between work, study, and personal life." },
  { key: "achievement_03_results_matter", order: 13, scale: "achievement", prompt: "I feel motivated when my results clearly matter." },
  { key: "independence_03_try_ideas", order: 14, scale: "independence", prompt: "I feel motivated when I can try my own ideas." },
  { key: "recognition_03_rewards", order: 15, scale: "recognition", prompt: "I feel motivated by rewards, titles, or public appreciation." },
  { key: "relationships_03_belonging", order: 16, scale: "relationships", prompt: "I feel motivated when I belong to a caring team." },
  { key: "support_03_training", order: 17, scale: "support", prompt: "I feel motivated when I get training and support to grow." },
  { key: "working_conditions_03_predictable", order: 18, scale: "working_conditions", prompt: "I feel motivated when work conditions are predictable and comfortable." },
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
    throw new Error("WIP assessment definition upsert returned no id.");
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
    throw new Error("WIP assessment version upsert returned no id.");
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
