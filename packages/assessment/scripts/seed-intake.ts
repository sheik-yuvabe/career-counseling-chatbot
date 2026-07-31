import { Pool } from "pg";

process.loadEnvFile("../../.env");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const sets = [
  { segment: "explorer", version: "1.0", language: "en" },
  { segment: "pathfinder", version: "1.0", language: "en" },
  { segment: "launcher", version: "1.0", language: "en" },
] as const;

const questions = {
  explorer: [
    ["school_board", 1, "Which school board are you studying in?", "single_choice", ["cbse", "state_board", "icse", "other", "prefer_not_to_say"], false, true],
    ["class_level", 2, "Which class are you currently in?", "single_choice", ["class_7", "class_8", "class_9", "class_10", "other"], false, true],
    ["favorite_subject", 3, "Which subject do you enjoy most?", "single_choice", ["science", "maths", "english", "social_science", "art", "computer_science", "not_sure"], false, true],
    ["flow_activity", 4, "What activity makes time pass quickly for you?", "single_choice", ["building_things", "solving_puzzles", "drawing_or_design", "helping_people", "leading_groups", "organizing_details", "not_sure"], false, true],
    ["support_needed", 5, "What kind of support would help you most now?", "single_choice", ["choose_stream", "understand_strengths", "study_plan", "career_ideas", "scholarship_or_aid", "not_sure"], false, true],
  ],
  pathfinder: [
    ["education_stage", 11, "Where are you in your education journey?", "single_choice", ["class_11", "class_12", "diploma", "gap_year", "other"], false, true],
    ["current_stream", 12, "Which stream or subject group are you in?", "single_choice", ["science_pcm", "science_pcb", "commerce", "arts_humanities", "vocational", "not_decided", "other"], false, true],
    ["marks_band", 13, "Which marks band best describes your recent performance?", "single_choice", ["below_50", "50_60", "60_75", "75_90", "90_plus", "prefer_not_to_say"], true, true],
    ["preferred_work_style", 14, "How do you prefer to work?", "single_choice", ["hands_on", "research_and_analysis", "creative_expression", "people_support", "business_leadership", "structured_process"], false, true],
    ["decision_confidence", 15, "How confident are you about your next step?", "single_choice", ["very_confident", "somewhat_confident", "confused", "starting_from_zero"], false, true],
    ["constraints", 16, "Which constraint matters most right now?", "single_choice", ["fees", "distance", "family_expectations", "entrance_exam", "language", "none", "prefer_not_to_say"], true, true],
    ["support_needed", 17, "What should YuvaNext help with first?", "single_choice", ["stream_choice", "career_shortlist", "college_pathway", "exam_plan", "aid_options", "not_sure"], false, true],
  ],
  launcher: [
    ["current_status", 21, "What are you doing right now?", "single_choice", ["college", "graduate", "working", "job_search", "gap_year", "other"], false, true],
    ["current_goal", 22, "What is your current goal?", "single_choice", ["job", "higher_studies", "career_switch", "skill_building", "business", "not_sure"], false, true],
    ["education_level", 23, "What is your highest completed education level?", "single_choice", ["class_12", "diploma", "bachelors", "masters", "iti", "other"], false, true],
    ["field_of_study", 24, "Which field is closest to your study or work?", "single_choice", ["engineering_tech", "science", "commerce_management", "arts_design", "healthcare", "education", "public_services", "other"], false, true],
    ["experience_band", 25, "How much work experience do you have?", "single_choice", ["none", "less_than_1_year", "1_3_years", "3_5_years", "5_plus_years"], false, true],
    ["marks_band", 26, "Which academic performance band best represents you?", "single_choice", ["below_50", "50_60", "60_75", "75_90", "90_plus", "prefer_not_to_say"], true, true],
    ["preferred_work_style", 27, "What type of work feels most natural to you?", "single_choice", ["hands_on", "research_and_analysis", "creative_expression", "people_support", "business_leadership", "structured_process"], false, true],
    ["location_preference", 28, "What location option do you prefer?", "single_choice", ["same_city", "same_state", "anywhere_in_india", "remote", "not_sure"], false, true],
    ["support_needed", 29, "What support do you want first?", "single_choice", ["career_shortlist", "job_roles", "higher_study_path", "skills_plan", "aid_options", "not_sure"], false, true],
  ],
} as const;

const client = await pool.connect();

try {
  await client.query("begin");
  const setIds: Record<string, string> = {};

  for (const set of sets) {
    const result = await client.query<{ id: string }>(
      `
        insert into assessment.intake_question_sets
          (id, segment, version, language, status, effective_from, retired_at, created_at)
        values
          (gen_random_uuid(), $1, $2, $3, 'approved', now() - interval '1 day', null, now())
        on conflict (segment, version) do update set
          status = excluded.status,
          language = excluded.language,
          effective_from = excluded.effective_from
        returning id
      `,
      [set.segment, set.version, set.language],
    );
    setIds[set.segment] = result.rows[0]?.id ?? "";
  }

  let insertedQuestions = 0;
  for (const [segment, segmentQuestions] of Object.entries(questions)) {
    const questionSetId = setIds[segment];
    for (const [key, order, prompt, type, options, sensitive, required] of segmentQuestions) {
      const existing = await client.query(
        "select id from assessment.intake_questions where question_set_id = $1 and question_key = $2 limit 1",
        [questionSetId, key],
      );
      if (existing.rowCount === 0) {
        await client.query(
          `
            insert into assessment.intake_questions
              (id, question_set_id, question_key, display_order, prompt_text, response_type, options_json, is_sensitive, is_required)
            values
              (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7, $8)
          `,
          [questionSetId, key, order, prompt, type, JSON.stringify(options), sensitive, required],
        );
        insertedQuestions += 1;
      }
    }
  }

  await client.query("commit");

  const counts = await pool.query(
    `
      select s.segment, s.version, count(q.id)::int as question_count
      from assessment.intake_question_sets s
      left join assessment.intake_questions q on q.question_set_id = s.id
      group by s.segment, s.version
      order by s.segment
    `,
  );
  console.log(JSON.stringify({ insertedQuestions, counts: counts.rows }, null, 2));
} catch (error) {
  await client.query("rollback");
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
