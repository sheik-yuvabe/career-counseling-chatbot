import type {
  AidSchemeCatalogRecord,
  CareerCatalogRecord,
  CollegeCatalogRecord,
  MatchingConfig,
  PathwayCatalogRecord,
  PlanTemplateCatalogRecord,
  ProfileSnapshotForRecommendations,
  RiasecLetter,
  RiasecVector,
  StreamCatalogRecord,
} from "@yuvanext/contracts";
import type { Pool } from "pg";
import type { FeasibilityRule } from "../domain/career-matching.js";
import type { StoredFacts } from "../domain/aid-recommendations.js";

const RIASEC_TIE_ORDER: [RiasecLetter, RiasecLetter, RiasecLetter, RiasecLetter, RiasecLetter, RiasecLetter] = [
  "R",
  "I",
  "A",
  "S",
  "E",
  "C",
];

export type RecommendationDataSource = {
  loadProfile(profileSnapshotId: string): Promise<ProfileSnapshotForRecommendations>;
  loadActiveConfig(configurationKey: string): Promise<MatchingConfig>;
  loadFeasibilityRules(config: MatchingConfig): Promise<FeasibilityRule[]>;
  loadCareers(limit?: number): Promise<CareerCatalogRecord[]>;
  loadStreams(profile: ProfileSnapshotForRecommendations, limit?: number): Promise<StreamCatalogRecord[]>;
  loadPathways(limit?: number): Promise<PathwayCatalogRecord[]>;
  loadColleges(limit?: number): Promise<CollegeCatalogRecord[]>;
  loadAidSchemes(limit?: number): Promise<AidSchemeCatalogRecord[]>;
  loadPlanTemplates(limit?: number): Promise<PlanTemplateCatalogRecord[]>;
  loadStoredFacts(profile: ProfileSnapshotForRecommendations): StoredFacts;
  loadLatestRankedEntityIds(
    profileSnapshotId: string,
    kind: "career" | "stream" | "pathway",
  ): Promise<string[]>;
  loadTargetDisciplineIds(pathwayId: string | undefined): Promise<string[]>;
};

export function createPostgresRecommendationDataSource(pool: Pool): RecommendationDataSource {
  return {
    async loadProfile(profileSnapshotId) {
      const result = await pool.query<{
        id: string;
        profile_version: number;
        segment: "explorer" | "pathfinder" | "launcher";
        state: string;
        intake_summary_json: Record<string, unknown>;
        result_summary_json: Record<string, unknown>;
        payload_hash: string;
      }>(
        `select
          id,
          profile_version,
          segment,
          state,
          intake_summary_json,
          result_summary_json,
          payload_hash
        from assessment.profile_snapshots
        where id = $1`,
        [profileSnapshotId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Profile snapshot ${profileSnapshotId} was not found`);
      }

      return {
        profileSnapshotId: row.id,
        profileVersion: String(row.profile_version),
        profileHash: row.payload_hash,
        segment: row.segment,
        state: row.state,
        ...optionalString("marksBand", readFirstString(row.intake_summary_json, ["marksBand", "marks_band"])),
        riasec: readRiasecVector(row.result_summary_json),
        ...optionalVector("workValues", readWorkValues(row.result_summary_json)),
      };
    },

    async loadActiveConfig(configurationKey) {
      return loadConfigByKey(pool, configurationKey);
    },

    async loadFeasibilityRules(config) {
      const result = await pool.query<{
        segment: ProfileSnapshotForRecommendations["segment"];
        marks_band: string;
        education_route_id: string;
        reachability: string;
        priority: number;
      }>(
        `select
          rule.segment,
          rule.marks_band,
          rule.education_route_id,
          rule.reachability,
          rule.priority
        from recommendation.feasibility_rules rule
        join recommendation.matching_configurations config on config.id = rule.configuration_id
        where config.algorithm_version = $1 and config.version = $2
        order by rule.priority asc`,
        [config.algorithmVersion, config.weightsVersion],
      );

      return result.rows.map((row) => ({
        segment: row.segment,
        marksBand: row.marks_band,
        routeId: row.education_route_id,
        reachability: normalizeReachability(row.reachability),
        priority: row.priority,
      }));
    },

    async loadCareers(limit = 30) {
      const result = await pool.query<{
        id: string;
        title: string;
        dataset_version: string;
        route_ids: string[];
        route_levels: string[];
        realistic: string;
        investigative: string;
        artistic: string;
        social: string;
        enterprising: string;
        conventional: string;
        achievement: string | null;
        independence: string | null;
        recognition: string | null;
        relationships: string | null;
        support: string | null;
        working_conditions: string | null;
      }>(
        `select
          career.id,
          career.title,
          dataset.version as dataset_version,
          array_remove(array_agg(distinct route.id), null) as route_ids,
          array_remove(array_agg(distinct route.route_level), null) as route_levels,
          interest.realistic,
          interest.investigative,
          interest.artistic,
          interest.social,
          interest.enterprising,
          interest.conventional,
          value_profile.achievement,
          value_profile.independence,
          value_profile.recognition,
          value_profile.relationships,
          value_profile.support,
          value_profile.working_conditions
        from knowledge.careers career
        join knowledge.dataset_versions dataset on dataset.id = career.dataset_version_id
        join knowledge.career_interest_profiles interest on interest.career_id = career.id
        left join knowledge.career_value_profiles value_profile on value_profile.career_id = career.id
        left join knowledge.career_pathways career_pathway on career_pathway.career_id = career.id
        left join knowledge.pathways pathway on pathway.id = career_pathway.pathway_id
        left join knowledge.education_routes route
          on route.id = coalesce(pathway.education_route_id, career.primary_education_route_id)
        where career.publication_status = 'published'
        group by career.id, dataset.version, interest.career_id, value_profile.career_id
        order by career.title asc
        limit $1`,
        [limit],
      );

      return result.rows.map((row) => ({
        careerId: row.id,
        title: row.title,
        riasec: {
          R: Number(row.realistic),
          I: Number(row.investigative),
          A: Number(row.artistic),
          S: Number(row.social),
          E: Number(row.enterprising),
          C: Number(row.conventional),
        },
        routeIds: row.route_ids.length === 0 ? ["00000000-0000-4000-8000-000000000000"] : row.route_ids,
        datasetVersion: row.dataset_version,
        verified: true,
        isVocationalRoute: row.route_levels.some((level) =>
          ["certificate", "iti", "diploma", "open"].includes(level),
        ),
        ...optionalVector("workValues", readCareerWorkValues(row)),
      }));
    },

    async loadStreams(profile, limit = 30) {
      const topTwo = topRiasecCode(profile.riasec);
      const result = await pool.query<{
        id: string;
        title: string;
        rank: number;
        top_two_code: string;
        dataset_version: string;
      }>(
        `select
          stream.id,
          stream.title,
          item.rank,
          map.top_two_code,
          dataset.version as dataset_version
        from knowledge.stream_maps map
        join knowledge.stream_map_items item on item.map_id = map.id
        join knowledge.stream_options stream on stream.id = item.stream_option_id
        join knowledge.dataset_versions dataset on dataset.id = map.dataset_version_id
        where map.status = 'published'
          and stream.status = 'active'
          and map.top_two_code = $1
        order by item.rank asc, stream.title asc
        limit $2`,
        [topTwo, limit],
      );

      return result.rows.map((row) => ({
        streamId: row.id,
        title: row.title,
        riasecLetters: row.top_two_code.split("").filter(isRiasecLetter),
        recommendedSegments: ["explorer", "pathfinder", "launcher"],
        priority: row.rank,
        datasetVersion: row.dataset_version,
        verified: true,
      }));
    },

    async loadPathways(limit = 30) {
      const streamIds = await loadActiveStreamIds(pool);
      const result = await pool.query<{
        id: string;
        title: string;
        career_ids: string[];
        dataset_version: string;
        route_level: string | null;
        backup_route_note: string | null;
      }>(
        `select
          pathway.id,
          pathway.title,
          array_remove(array_agg(distinct career_pathway.career_id), null) as career_ids,
          dataset.version as dataset_version,
          route.route_level,
          pathway.backup_route_note
        from knowledge.pathways pathway
        join knowledge.dataset_versions dataset on dataset.id = pathway.dataset_version_id
        join knowledge.education_routes route on route.id = pathway.education_route_id
        left join knowledge.career_pathways career_pathway on career_pathway.pathway_id = pathway.id
        where pathway.publication_status = 'published'
        group by pathway.id, dataset.version, route.route_level
        order by pathway.title asc
        limit $1`,
        [limit],
      );

      return result.rows.map((row, index) => ({
        pathwayId: row.id,
        title: row.title,
        careerIds: row.career_ids.length === 0 ? ["00000000-0000-4000-8000-000000000000"] : row.career_ids,
        streamIds,
        recommendedSegments: ["explorer", "pathfinder", "launcher"],
        reachability: routeReachability(row.route_level),
        hasBackupRoute: Boolean(row.backup_route_note),
        priority: index + 1,
        datasetVersion: row.dataset_version,
        verified: true,
      }));
    },

    async loadColleges(limit = 30) {
      const result = await pool.query<{
        id: string;
        name: string;
        state: string;
        tier: number | null;
        institution_type: string;
        discipline_ids: string[];
        dataset_version: string;
      }>(
        `select
          college.id,
          college.name,
          college.state,
          college.tier,
          college.institution_type,
          array_remove(array_agg(distinct program.discipline_id), null) as discipline_ids,
          dataset.version as dataset_version
        from knowledge.colleges college
        join knowledge.dataset_versions dataset on dataset.id = college.dataset_version_id
        left join knowledge.college_programs program
          on program.college_id = college.id and program.verification_status = 'verified'
        where college.verification_status = 'verified'
        group by college.id, dataset.version
        order by college.name asc
        limit $1`,
        [limit],
      );

      return result.rows.map((row) => ({
        collegeId: row.id,
        title: row.name,
        disciplineIds: row.discipline_ids.length === 0 ? ["00000000-0000-4000-8000-000000000000"] : row.discipline_ids,
        state: row.state,
        tier: row.tier ?? 3,
        collegeType: normalizeCollegeType(row.institution_type),
        datasetVersion: row.dataset_version,
        verified: true,
      }));
    },

    async loadAidSchemes(limit = 30) {
      const result = await pool.query<{
        id: string;
        name: string;
        application_url: string;
        dataset_version: string;
        criteria_json: Array<{ factKey: string; acceptedValues?: string[] }>;
      }>(
        `select
          scheme.id,
          scheme.name,
          scheme.application_url,
          dataset.version as dataset_version,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'factKey', criterion.criterion_type,
                'acceptedValues', criterion.value_json
              )
            ) filter (where criterion.id is not null),
            '[]'::jsonb
          ) as criteria_json
        from knowledge.aid_schemes scheme
        join knowledge.dataset_versions dataset on dataset.id = scheme.dataset_version_id
        left join knowledge.aid_criteria criterion on criterion.aid_scheme_id = scheme.id
        where scheme.verification_status = 'verified'
        group by scheme.id, dataset.version
        order by scheme.name asc
        limit $1`,
        [limit],
      );

      return result.rows
        .filter((row) => row.criteria_json.length > 0)
        .map((row, index) => ({
          aidSchemeId: row.id,
          title: row.name,
          criteria: row.criteria_json.map((criterion) => ({
            factKey: normalizeFactKey(criterion.factKey),
            acceptedValues: normalizeAcceptedValues(criterion.acceptedValues),
          })),
          priority: index + 1,
          sourceUrl: row.application_url,
          datasetVersion: row.dataset_version,
          verified: true,
        }));
    },

    async loadPlanTemplates(limit = 30) {
      const result = await pool.query<{
        id: string;
        template_key: string;
        segment: "explorer" | "pathfinder" | "launcher";
        plan_type: "exploration" | "pathway" | "career_90_day";
        version: string;
        steps_json: Array<{
          stepOrder: number;
          timeWindow: string;
          actionTemplate: string;
          isOptional: boolean;
        }>;
      }>(
        `select
          template.id,
          template.template_key,
          template.segment,
          template.plan_type,
          template.version,
          jsonb_agg(
            jsonb_build_object(
              'stepOrder', step.step_order,
              'timeWindow', step.time_window,
              'actionTemplate', step.action_key,
              'isOptional', step.is_optional
            )
            order by step.step_order asc
          ) as steps_json
        from recommendation.plan_templates template
        join recommendation.plan_template_steps step on step.plan_template_id = template.id
        where template.status = 'approved'
        group by template.id
        order by template.template_key asc
        limit $1`,
        [limit],
      );

      return result.rows.map((row, index) => ({
        planTemplateId: row.id,
        title: row.template_key,
        segment: row.segment,
        planType: row.plan_type,
        priority: index + 1,
        steps: row.steps_json,
        datasetVersion: row.version,
        verified: true,
      }));
    },

    loadStoredFacts(profile) {
      return {
        state: profile.state,
        marksBand: profile.marksBand,
        segment: profile.segment,
      };
    },

    async loadLatestRankedEntityIds(profileSnapshotId, kind) {
      const result = await pool.query<{ entity_id: string }>(
        `select coalesce(
          item.career_id,
          item.stream_option_id,
          item.pathway_id,
          item.college_id,
          item.aid_scheme_id
        ) as entity_id
        from recommendation.recommendation_runs run
        join recommendation.recommendation_items item on item.recommendation_run_id = run.id
        where run.profile_snapshot_id = $1
          and run.kind = $2
          and run.status = 'completed'
        order by run.completed_at desc nulls last, item.rank asc`,
        [profileSnapshotId, kind],
      );

      return result.rows.map((row) => row.entity_id).filter(Boolean);
    },

    async loadTargetDisciplineIds(pathwayId) {
      if (!pathwayId) {
        return [];
      }

      const result = await pool.query<{ discipline_id: string }>(
        `select discipline_id
        from knowledge.pathway_disciplines
        where pathway_id = $1
        order by relevance_weight desc`,
        [pathwayId],
      );

      return result.rows.map((row) => row.discipline_id);
    },
  };
}

async function loadActiveStreamIds(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    "select id from knowledge.stream_options where status = 'active' order by title asc",
  );
  const ids = result.rows.map((row) => row.id);
  return ids.length === 0 ? ["00000000-0000-4000-8000-000000000000"] : ids;
}

async function loadConfigByKey(pool: Pool, configurationKey: string): Promise<MatchingConfig> {
  const result = await pool.query<{
    algorithm_version: string;
    version: string;
    interest_weight: string | null;
    values_weight: string | null;
    feasibility_weight: string | null;
    context_weight: string | null;
    rounding_scale: number;
    riasec_tie_order: RiasecLetter[] | null;
  }>(
    `select
      algorithm_version,
      version,
      interest_weight,
      values_weight,
      feasibility_weight,
      context_weight,
      rounding_scale,
      riasec_tie_order
    from recommendation.matching_configurations
    where configuration_key = $1 and status = 'active'
    order by approved_at desc nulls last, created_at desc
    limit 1`,
    [configurationKey],
  );
  const row = result.rows[0];
  if (!row && configurationKey !== "career_match") {
    return loadConfigByKey(pool, "career_match");
  }

  if (!row) {
    throw new Error(`No active matching configuration found for ${configurationKey}`);
  }

  return {
    algorithmVersion: row.algorithm_version,
    weightsVersion: row.version,
    interestWeight: toNumber(row.interest_weight, 0.5),
    valuesWeight: toNumber(row.values_weight, 0.2),
    feasibilityWeight: toNumber(row.feasibility_weight, 0.15),
    contextWeight: toNumber(row.context_weight, 0.15),
    roundingScale: row.rounding_scale,
    feasibilityLookupVersion: row.version,
    riasecTieOrder: normalizeTieOrder(row.riasec_tie_order),
  };
}

function readRiasecVector(summary: Record<string, unknown>): RiasecVector {
  const riasec = readNestedRecord(summary, ["riasec", "interest", "interests"]);
  const normalized = readNestedRecord(riasec, ["normalizedScores", "normalized_scores", "scores"]);
  const raw = readNestedRecord(riasec, ["rawScores", "raw_scores"]);
  const source = Object.keys(normalized).length > 0 ? normalized : raw;
  return {
    R: readNumber(source, ["R", "realistic"]),
    I: readNumber(source, ["I", "investigative"]),
    A: readNumber(source, ["A", "artistic"]),
    S: readNumber(source, ["S", "social"]),
    E: readNumber(source, ["E", "enterprising"]),
    C: readNumber(source, ["C", "conventional"]),
  };
}

function readWorkValues(summary: Record<string, unknown>): RiasecVector | undefined {
  const values = readNestedRecord(summary, ["workValues", "work_values", "values"]);
  const normalized = readNestedRecord(values, ["normalizedScores", "normalized_scores", "scores"]);
  const source = Object.keys(normalized).length > 0 ? normalized : values;
  const vector = {
    R: readOptionalNumber(source, ["R", "achievement"]),
    I: readOptionalNumber(source, ["I", "independence"]),
    A: readOptionalNumber(source, ["A", "recognition"]),
    S: readOptionalNumber(source, ["S", "relationships"]),
    E: readOptionalNumber(source, ["E", "support"]),
    C: readOptionalNumber(source, ["C", "working_conditions", "workingConditions"]),
  };

  const { R, I, A, S, E, C } = vector;
  if (R === undefined || I === undefined || A === undefined || S === undefined || E === undefined || C === undefined) {
    return undefined;
  }

  return { R, I, A, S, E, C };
}

function readCareerWorkValues(row: {
  achievement: string | null;
  independence: string | null;
  recognition: string | null;
  relationships: string | null;
  support: string | null;
  working_conditions: string | null;
}): RiasecVector | undefined {
  if (
    !row.achievement ||
    !row.independence ||
    !row.recognition ||
    !row.relationships ||
    !row.support ||
    !row.working_conditions
  ) {
    return undefined;
  }

  return {
    R: Number(row.achievement),
    I: Number(row.independence),
    A: Number(row.recognition),
    S: Number(row.relationships),
    E: Number(row.support),
    C: Number(row.working_conditions),
  };
}

function readNestedRecord(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return {};
}

function readNumber(source: Record<string, unknown>, keys: string[]): number {
  const value = readOptionalNumber(source, keys);
  if (value === undefined) {
    throw new Error(`Profile snapshot is missing RIASEC value ${keys.join("/")}`);
  }

  return value;
}

function readOptionalNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
  }

  return undefined;
}

function readFirstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function optionalString<Key extends string>(key: Key, value: string | undefined): Record<Key, string> | object {
  return value ? { [key]: value } : {};
}

function optionalVector<Key extends string>(key: Key, value: RiasecVector | undefined): Record<Key, RiasecVector> | object {
  return value ? { [key]: value } : {};
}

function toNumber(value: string | null, fallback: number): number {
  return value === null ? fallback : Number(value);
}

function normalizeTieOrder(value: RiasecLetter[] | null): typeof RIASEC_TIE_ORDER {
  if (!value || value.length !== 6 || !value.every(isRiasecLetter)) {
    return RIASEC_TIE_ORDER;
  }

  return value as typeof RIASEC_TIE_ORDER;
}

function isRiasecLetter(value: string): value is RiasecLetter {
  return ["R", "I", "A", "S", "E", "C"].includes(value);
}

function topRiasecCode(vector: RiasecVector): string {
  return [...RIASEC_TIE_ORDER]
    .sort((left, right) => vector[right] - vector[left])
    .slice(0, 2)
    .join("");
}

function normalizeReachability(value: string): 0.3 | 0.65 | 1 {
  const numeric = Number(value);
  if (numeric <= 0.3) return 0.3;
  if (numeric >= 1) return 1;
  return 0.65;
}

function routeReachability(routeLevel: string | null): number {
  if (routeLevel && ["degree", "school_stream"].includes(routeLevel)) {
    return 1;
  }

  if (routeLevel && ["diploma", "iti", "certificate", "open"].includes(routeLevel)) {
    return 0.65;
  }

  return 0.5;
}

function normalizeCollegeType(value: string): CollegeCatalogRecord["collegeType"] {
  const normalized = value.trim().toLocaleLowerCase("en");
  if (normalized.includes("polytechnic")) return "polytechnic";
  if (normalized.includes("iti")) return "iti";
  if (normalized.includes("open")) return "open_university";
  if (normalized.includes("vocational")) return "vocational";
  return "regular";
}

function normalizeFactKey(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("en");
  if (normalized === "marks_band") return "marksBand";
  if (normalized === "income_band") return "incomeBand";
  return normalized;
}

function normalizeAcceptedValues(values: unknown): string[] | undefined {
  if (Array.isArray(values)) {
    return values.map(String);
  }

  if (values && typeof values === "object") {
    const record = values as Record<string, unknown>;
    if (Array.isArray(record.values)) {
      return record.values.map(String);
    }

    if (typeof record.value === "string" || typeof record.value === "number" || typeof record.value === "boolean") {
      return [String(record.value)];
    }
  }

  if (typeof values === "string" || typeof values === "number" || typeof values === "boolean") {
    return [String(values)];
  }

  return undefined;
}
