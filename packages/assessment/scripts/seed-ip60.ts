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
  throw new Error("DATABASE_URL is required to seed ip_60 assessment catalog data.");
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
  code: "ip_60",
  name: "YuvaNext Interest Profiler 60",
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
  { key: "r_01_build_fix_tools", order: 1, scale: "R", prompt: "I enjoy building, fixing, or working with tools and materials." },
  { key: "i_01_solve_science_questions", order: 2, scale: "I", prompt: "I enjoy solving science, technology, or research-based questions." },
  { key: "a_01_create_original_work", order: 3, scale: "A", prompt: "I enjoy creating original work such as art, writing, music, or design." },
  { key: "s_01_help_people_learn", order: 4, scale: "S", prompt: "I enjoy helping people learn, understand, or feel supported." },
  { key: "e_01_lead_people", order: 5, scale: "E", prompt: "I enjoy leading people, presenting ideas, or persuading others." },
  { key: "c_01_organize_details", order: 6, scale: "C", prompt: "I enjoy organizing information, records, schedules, or details." },
  { key: "r_02_work_outdoors", order: 7, scale: "R", prompt: "I like practical tasks that involve movement, machines, or outdoor work." },
  { key: "i_02_analyze_data", order: 8, scale: "I", prompt: "I like analyzing data, patterns, problems, or why something works." },
  { key: "a_02_express_ideas", order: 9, scale: "A", prompt: "I like expressing ideas in a visual, written, or performance style." },
  { key: "s_02_listen_support", order: 10, scale: "S", prompt: "I like listening to others and helping them solve personal or learning problems." },
  { key: "e_02_start_projects", order: 11, scale: "E", prompt: "I like starting projects, making decisions, and motivating a group." },
  { key: "c_02_follow_process", order: 12, scale: "C", prompt: "I like following a clear process and completing tasks accurately." },
  { key: "r_03_use_hands", order: 13, scale: "R", prompt: "I prefer tasks where I can use my hands and see a practical result." },
  { key: "i_03_experiment", order: 14, scale: "I", prompt: "I enjoy experimenting, testing ideas, and learning from evidence." },
  { key: "a_03_design_new_things", order: 15, scale: "A", prompt: "I enjoy designing new things, even when there is no single correct answer." },
  { key: "s_03_teach_or_care", order: 16, scale: "S", prompt: "I enjoy teaching, caring, guiding, or working closely with people." },
  { key: "e_03_sell_or_pitch", order: 17, scale: "E", prompt: "I enjoy selling, pitching, debating, or influencing decisions." },
  { key: "c_03_manage_numbers", order: 18, scale: "C", prompt: "I enjoy working with numbers, forms, checklists, or structured data." },
  { key: "r_04_repair_equipment", order: 19, scale: "R", prompt: "I would enjoy repairing equipment, assembling parts, or handling devices." },
  { key: "i_04_deep_research", order: 20, scale: "I", prompt: "I would enjoy doing deep research before deciding on an answer." },
  { key: "a_04_make_content", order: 21, scale: "A", prompt: "I would enjoy making content, visuals, stories, products, or experiences." },
  { key: "s_04_community_work", order: 22, scale: "S", prompt: "I would enjoy working in education, health, counseling, or community support." },
  { key: "e_04_business_action", order: 23, scale: "E", prompt: "I would enjoy business activities like planning, negotiating, or managing outcomes." },
  { key: "c_04_quality_control", order: 24, scale: "C", prompt: "I would enjoy checking quality, improving accuracy, and keeping work on track." },
  { key: "r_05_physical_systems", order: 25, scale: "R", prompt: "Careers involving machines, agriculture, construction, or physical systems interest me." },
  { key: "i_05_technical_ideas", order: 26, scale: "I", prompt: "Careers involving investigation, coding, medicine, or technical ideas interest me." },
  { key: "a_05_creative_fields", order: 27, scale: "A", prompt: "Careers involving design, media, language, or creative expression interest me." },
  { key: "s_05_people_service", order: 28, scale: "S", prompt: "Careers involving teaching, social impact, service, or guidance interest me." },
  { key: "e_05_enterprise", order: 29, scale: "E", prompt: "Careers involving entrepreneurship, leadership, sales, or public influence interest me." },
  { key: "c_05_operations", order: 30, scale: "C", prompt: "Careers involving finance, administration, operations, or compliance interest me." },
  { key: "r_06_practical_problems", order: 31, scale: "R", prompt: "I like solving practical problems by trying things directly." },
  { key: "i_06_ask_why", order: 32, scale: "I", prompt: "I often ask why something happens and look for a logical explanation." },
  { key: "a_06_original_style", order: 33, scale: "A", prompt: "I like work where I can use my own style and imagination." },
  { key: "s_06_guide_friends", order: 34, scale: "S", prompt: "Friends often come to me when they need guidance or encouragement." },
  { key: "e_06_take_charge", order: 35, scale: "E", prompt: "I am comfortable taking charge when a group needs direction." },
  { key: "c_06_plan_steps", order: 36, scale: "C", prompt: "I like planning steps carefully before starting important work." },
  { key: "r_07_tools_equipment", order: 37, scale: "R", prompt: "I would enjoy learning to use technical tools, equipment, or instruments." },
  { key: "i_07_compare_evidence", order: 38, scale: "I", prompt: "I like comparing evidence before choosing the best answer." },
  { key: "a_07_perform_or_present", order: 39, scale: "A", prompt: "I enjoy performing, presenting, writing, or showing creative work." },
  { key: "s_07_team_support", order: 40, scale: "S", prompt: "I enjoy being part of a team where people support each other." },
  { key: "e_07_compete_goals", order: 41, scale: "E", prompt: "I enjoy competition, goals, and situations where results can be achieved." },
  { key: "c_07_keep_records", order: 42, scale: "C", prompt: "I like keeping records clear, complete, and easy to find." },
  { key: "r_08_make_physical_things", order: 43, scale: "R", prompt: "I would like work where I make, install, grow, or operate physical things." },
  { key: "i_08_lab_or_analysis", order: 44, scale: "I", prompt: "I would like work involving labs, analysis, diagnosis, or investigation." },
  { key: "a_08_brand_story_design", order: 45, scale: "A", prompt: "I would like work involving brand, story, design, media, or creative direction." },
  { key: "s_08_training_counseling", order: 46, scale: "S", prompt: "I would like work involving training, counseling, teaching, or public service." },
  { key: "e_08_manage_business", order: 47, scale: "E", prompt: "I would like work involving managing people, selling ideas, or running a business." },
  { key: "c_08_finance_admin", order: 48, scale: "C", prompt: "I would like work involving finance, administration, documentation, or compliance." },
  { key: "r_09_active_work", order: 49, scale: "R", prompt: "I prefer active work over sitting still for long periods." },
  { key: "i_09_complex_questions", order: 50, scale: "I", prompt: "I enjoy complex questions that require patient thinking." },
  { key: "a_09_open_ended_tasks", order: 51, scale: "A", prompt: "I enjoy open-ended tasks where the final result can be unique." },
  { key: "s_09_improve_lives", order: 52, scale: "S", prompt: "I feel motivated by work that improves people's lives." },
  { key: "e_09_influence_outcomes", order: 53, scale: "E", prompt: "I feel motivated by work where I can influence outcomes and decisions." },
  { key: "c_09_accuracy_rules", order: 54, scale: "C", prompt: "I feel motivated by work that values accuracy, rules, and dependable execution." },
  { key: "r_10_real_world_tasks", order: 55, scale: "R", prompt: "Real-world tasks with visible results feel satisfying to me." },
  { key: "i_10_learn_concepts", order: 56, scale: "I", prompt: "Learning concepts deeply feels satisfying to me." },
  { key: "a_10_make_beautiful_useful", order: 57, scale: "A", prompt: "Making something beautiful, meaningful, or expressive feels satisfying to me." },
  { key: "s_10_help_growth", order: 58, scale: "S", prompt: "Helping another person grow or succeed feels satisfying to me." },
  { key: "e_10_build_opportunity", order: 59, scale: "E", prompt: "Building an opportunity, campaign, or organization feels satisfying to me." },
  { key: "c_10_complete_accurately", order: 60, scale: "C", prompt: "Completing structured work accurately and on time feels satisfying to me." },
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
