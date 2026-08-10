import {
  AssessmentItemSchema,
  AssessmentResponseSchema,
  AssessmentResultSchema,
  AssessmentRunSchema,
  ProfileSnapshotSchema,
  type AssessmentItem,
  type AssessmentResponse,
  type AssessmentResult,
  type AssessmentRun,
  type InstrumentCode,
  type ProfileSnapshot,
  type Segment,
} from "@yuvanext/contracts";
import type { Pool } from "pg";
import type {
  AssessmentRepository,
  AssessmentVersionRecord,
  NewAssessmentResponse,
  NewAssessmentRun,
  NewProfileSnapshot,
} from "../application/assessment-repository.js";
import type { ScoredResponseInput } from "../domain/scoring.js";

type RunRow = {
  id: string; user_id: string; journey_session_id: string; assessment_version_id: string;
  instrument_code: InstrumentCode; instrument_version: string; algorithm_version: string;
  segment: Segment; status: AssessmentRun["status"]; current_position: number | null;
  started_at: Date; last_answered_at: Date | null; completed_at: Date | null; scored_at: Date | null;
  resume_expires_at: Date | null; attempt_number: number; created_at: Date;
};

type ItemRow = {
  id: string; item_key: string; display_order: number; item_type: AssessmentItem["itemType"];
  prompt_text: string | null; prompt_asset_ref: string | null; scale_code: string | null; is_qc: boolean | null;
  options: unknown;
};

type ResponseRow = {
  id: string; assessment_run_id: string; item_id: string; selected_option_id: string | null;
  response_value: number | null; response_json: unknown; latency_ms: number | null;
  answered_at: Date; received_at: Date;
};

type ResultRow = {
  id: string; assessment_run_id: string; user_id: string; instrument_code: InstrumentCode; instrument_version: string;
  algorithm_version: string; raw_scores_json: unknown; normalized_scores_json: unknown; result_code: string;
  confidence: "normal" | "soft" | null; close_scores: boolean | null; qc_summary_json: Record<string, unknown> | null;
  input_hash: string; output_hash: string; created_at: Date;
};

const mapRun = (row: RunRow): AssessmentRun => AssessmentRunSchema.parse({
  id: row.id,
  userId: row.user_id,
  journeySessionId: row.journey_session_id,
  assessmentVersionId: row.assessment_version_id,
  instrumentCode: row.instrument_code,
  instrumentVersion: row.instrument_version,
  algorithmVersion: row.algorithm_version,
  segment: row.segment,
  status: row.status,
  currentPosition: row.current_position ?? 0,
  startedAt: row.started_at.toISOString(),
  lastAnsweredAt: row.last_answered_at?.toISOString() ?? null,
  completedAt: row.completed_at?.toISOString() ?? null,
  scoredAt: row.scored_at?.toISOString() ?? null,
  resumeExpiresAt: row.resume_expires_at?.toISOString() ?? row.started_at.toISOString(),
  attemptNumber: row.attempt_number,
  createdAt: row.created_at.toISOString(),
});

const mapItem = (row: ItemRow): AssessmentItem => AssessmentItemSchema.parse({
  id: row.id,
  itemKey: row.item_key,
  displayOrder: row.display_order,
  itemType: row.item_type,
  promptText: row.prompt_text,
  promptAssetRef: row.prompt_asset_ref,
  scaleCode: row.scale_code,
  isQc: row.is_qc ?? false,
  options: row.options ?? [],
});

const mapResponse = (row: ResponseRow): AssessmentResponse => AssessmentResponseSchema.parse({
  id: row.id,
  assessmentRunId: row.assessment_run_id,
  itemId: row.item_id,
  selectedOptionId: row.selected_option_id,
  responseValue: row.response_value,
  responseJson: row.response_json,
  latencyMs: row.latency_ms,
  answeredAt: row.answered_at.toISOString(),
  receivedAt: row.received_at.toISOString(),
});

const mapResult = (row: ResultRow): AssessmentResult => AssessmentResultSchema.parse({
  id: row.id,
  assessmentRunId: row.assessment_run_id,
  userId: row.user_id,
  instrumentCode: row.instrument_code,
  instrumentVersion: row.instrument_version,
  algorithmVersion: row.algorithm_version,
  rawScores: row.raw_scores_json,
  normalizedScores: row.normalized_scores_json,
  resultCode: row.result_code,
  confidence: row.confidence ?? "normal",
  closeScores: row.close_scores ?? false,
  qcSummary: row.qc_summary_json ?? {},
  inputHash: row.input_hash,
  outputHash: row.output_hash,
  createdAt: row.created_at.toISOString(),
});

export class PgAssessmentRepository implements AssessmentRepository {
  constructor(private readonly pool: Pool) {}

  async findActiveVersion(input: {
    instrumentCode: InstrumentCode; language: string; ageAtOnboarding: number; now: string;
  }): Promise<AssessmentVersionRecord | null> {
    const result = await this.pool.query<{
      id: string; instrument_code: InstrumentCode; version: string; scoring_algorithm_version: string;
      batch_size: number | null; item_count: number;
    }>(`
      select av.id, ad.instrument_code, av.version, av.scoring_algorithm_version, av.batch_size, av.item_count
      from assessment.assessment_versions av
      join assessment.assessment_definitions ad on ad.id = av.definition_id
      where ad.instrument_code = $1
        and ad.status = 'active'
        and coalesce(av.language, 'en') = $2
        and av.review_status in ('approved', 'mock')
        and (av.age_min is null or av.age_min <= $3)
        and (av.age_max is null or av.age_max >= $3)
        and (av.effective_from is null or av.effective_from <= $4)
        and (av.retired_at is null or av.retired_at > $4)
      order by av.effective_from desc nulls last
      limit 1
    `, [input.instrumentCode, input.language, input.ageAtOnboarding, input.now]);
    const row = result.rows[0];
    return row ? {
      id: row.id,
      instrumentCode: row.instrument_code,
      instrumentVersion: row.version,
      algorithmVersion: row.scoring_algorithm_version,
      batchSize: row.batch_size ?? 10,
      itemCount: row.item_count,
    } : null;
  }

  async createRun(input: NewAssessmentRun): Promise<AssessmentRun> {
    const result = await this.pool.query<RunRow>(`
      insert into assessment.assessment_runs (
        id, user_id, journey_session_id, assessment_version_id, segment, status, current_position,
        started_at, last_answered_at, completed_at, scored_at, resume_expires_at, attempt_number, created_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,null,null,null,$9,$10,$11)
      returning *, (select ad.instrument_code from assessment.assessment_versions av join assessment.assessment_definitions ad on ad.id=av.definition_id where av.id=assessment_version_id) as instrument_code,
        (select av.version from assessment.assessment_versions av where av.id=assessment_version_id) as instrument_version,
        (select av.scoring_algorithm_version from assessment.assessment_versions av where av.id=assessment_version_id) as algorithm_version
    `, [input.id, input.userId, input.journeySessionId, input.assessmentVersionId, input.segment, input.status, input.currentPosition, input.startedAt, input.resumeExpiresAt, input.attemptNumber, input.createdAt]);
    const row = result.rows[0];
    if (!row) throw new Error("Assessment run insert returned no row.");
    return mapRun(row);
  }

  async findRunByIdForUser(input: { runId: string; userId: string }): Promise<AssessmentRun | null> {
    const result = await this.pool.query<RunRow>(`
      select ar.*, ad.instrument_code, av.version as instrument_version, av.scoring_algorithm_version as algorithm_version
      from assessment.assessment_runs ar
      join assessment.assessment_versions av on av.id = ar.assessment_version_id
      join assessment.assessment_definitions ad on ad.id = av.definition_id
      where ar.id = $1 and ar.user_id = $2
      limit 1
    `, [input.runId, input.userId]);
    const row = result.rows[0];
    return row ? mapRun(row) : null;
  }

  async listRunItems(runId: string): Promise<AssessmentItem[]> {
    const result = await this.pool.query<ItemRow>(`
      select ai.id, ai.item_key, ai.display_order, ai.item_type, ai.prompt_text, ai.prompt_asset_ref,
        ai.scale_code, ai.is_qc,
        coalesce(jsonb_agg(jsonb_build_object(
          'id', aio.id, 'optionKey', aio.option_key, 'displayOrder', aio.display_order,
          'labelText', aio.label_text, 'assetRef', aio.asset_ref
        ) order by aio.display_order) filter (where aio.id is not null), '[]'::jsonb) as options
      from assessment.assessment_runs ar
      join assessment.assessment_items ai on ai.assessment_version_id = ar.assessment_version_id
      left join assessment.assessment_item_options aio on aio.item_id = ai.id
      where ar.id = $1 and coalesce(ai.review_status, 'approved') in ('approved', 'mock')
      group by ai.id
      order by ai.display_order
    `, [runId]);
    return result.rows.map(mapItem);
  }

  async listAnsweredItemIds(runId: string): Promise<Set<string>> {
    const result = await this.pool.query<{ item_id: string }>(
      `select item_id from assessment.assessment_responses where assessment_run_id = $1`,
      [runId],
    );
    return new Set(result.rows.map((row) => row.item_id));
  }

  async findItemForRun(input: { runId: string; itemId: string }): Promise<AssessmentItem | null> {
    const items = await this.listRunItems(input.runId);
    return items.find((item) => item.id === input.itemId) ?? null;
  }

  async findOptionForItem(input: { itemId: string; optionId: string }): Promise<{ id: string; scoreDelta: number | null } | null> {
    const result = await this.pool.query<{ id: string; score_delta: string | null }>(
      `select id, score_delta from assessment.assessment_item_options where id = $1 and item_id = $2 limit 1`,
      [input.optionId, input.itemId],
    );
    const row = result.rows[0];
    return row ? { id: row.id, scoreDelta: row.score_delta === null ? null : Number(row.score_delta) } : null;
  }

  async upsertResponse(input: NewAssessmentResponse): Promise<AssessmentResponse> {
    const result = await this.pool.query<ResponseRow>(`
      insert into assessment.assessment_responses (
        id, assessment_run_id, item_id, selected_option_id, response_value, response_json,
        latency_ms, answered_at, received_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (assessment_run_id, item_id) do update set
        selected_option_id = excluded.selected_option_id,
        response_value = excluded.response_value,
        response_json = excluded.response_json,
        latency_ms = excluded.latency_ms,
        answered_at = excluded.answered_at,
        received_at = excluded.received_at
      returning *
    `, [input.id, input.assessmentRunId, input.itemId, input.selectedOptionId, input.responseValue, input.responseJson, input.latencyMs, input.answeredAt, input.receivedAt]);
    const row = result.rows[0];
    if (!row) throw new Error("Assessment response upsert returned no row.");
    return mapResponse(row);
  }

  async updateRunProgress(input: { runId: string; currentPosition: number; status: "active" | "completed"; now: string }): Promise<AssessmentRun> {
    const result = await this.pool.query<RunRow>(`
      update assessment.assessment_runs
      set current_position = $2, status = $3, last_answered_at = $4, completed_at = case when $3='completed' then $4 else completed_at end
      where id = $1
      returning *, (select ad.instrument_code from assessment.assessment_versions av join assessment.assessment_definitions ad on ad.id=av.definition_id where av.id=assessment_version_id) as instrument_code,
        (select av.version from assessment.assessment_versions av where av.id=assessment_version_id) as instrument_version,
        (select av.scoring_algorithm_version from assessment.assessment_versions av where av.id=assessment_version_id) as algorithm_version
    `, [input.runId, input.currentPosition, input.status, input.now]);
    const row = result.rows[0];
    if (!row) throw new Error("Assessment run update returned no row.");
    return mapRun(row);
  }

  async listScoringResponses(runId: string): Promise<ScoredResponseInput[]> {
    const result = await this.pool.query<ScoredResponseInput>(`
      select ar.item_id as "itemId", ai.scale_code as "scaleCode", coalesce(ai.is_qc, false) as "isQc",
        ar.response_value as "responseValue", aio.score_delta::float as "scoreDelta"
      from assessment.assessment_responses ar
      join assessment.assessment_items ai on ai.id = ar.item_id
      left join assessment.assessment_item_options aio on aio.id = ar.selected_option_id
      where ar.assessment_run_id = $1
      order by ai.display_order
    `, [runId]);
    return result.rows;
  }

  async createResult(input: AssessmentResult): Promise<AssessmentResult> {
    const result = await this.pool.query<ResultRow>(`
      insert into assessment.assessment_results (
        id, assessment_run_id, user_id, instrument_code, instrument_version, algorithm_version,
        raw_scores_json, normalized_scores_json, result_code, confidence, close_scores,
        qc_summary_json, input_hash, output_hash, created_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      on conflict (assessment_run_id) do nothing
      returning *
    `, [input.id, input.assessmentRunId, input.userId, input.instrumentCode, input.instrumentVersion, input.algorithmVersion, input.rawScores, input.normalizedScores, input.resultCode, input.confidence, input.closeScores, input.qcSummary, input.inputHash, input.outputHash, input.createdAt]);
    const row = result.rows[0];
    if (row) {
      await this.pool.query(`update assessment.assessment_runs set status='scored', scored_at=$2 where id=$1`, [input.assessmentRunId, input.createdAt]);
      return mapResult(row);
    }
    const existing = await this.findResultByRunForUser({ runId: input.assessmentRunId, userId: input.userId });
    if (!existing) throw new Error("Assessment result insert returned no row.");
    return existing;
  }

  async findResultByRunForUser(input: { runId: string; userId: string }): Promise<AssessmentResult | null> {
    const result = await this.pool.query<ResultRow>(
      `select * from assessment.assessment_results where assessment_run_id=$1 and user_id=$2 limit 1`,
      [input.runId, input.userId],
    );
    const row = result.rows[0];
    return row ? mapResult(row) : null;
  }

  async findLatestResultByUserForInstrument(input: {
    userId: string;
    instrumentCode: InstrumentCode;
  }): Promise<AssessmentResult | null> {
    const result = await this.pool.query<ResultRow>(
      `select *
       from assessment.assessment_results
       where user_id = $1 and instrument_code = $2
       order by created_at desc
       limit 1`,
      [input.userId, input.instrumentCode],
    );
    const row = result.rows[0];
    return row ? mapResult(row) : null;
  }

  async getIntakeSummary(input: { userId: string; sessionId: string }): Promise<Record<string, unknown>> {
    const result = await this.pool.query<{ question_key: string; answer_json: unknown }>(`
      select iq.question_key, ia.answer_json
      from assessment.intake_answers ia
      join assessment.intake_questions iq on iq.id = ia.question_id
      where ia.user_id = $1 and ia.session_id = $2
      order by iq.display_order
    `, [input.userId, input.sessionId]);
    return Object.fromEntries(result.rows.map((row) => [row.question_key, row.answer_json]));
  }

  async getNextProfileVersion(userId: string): Promise<number> {
    const result = await this.pool.query<{ next_version: number }>(
      `select coalesce(max(profile_version), 0) + 1 as next_version from assessment.profile_snapshots where user_id=$1`,
      [userId],
    );
    return result.rows[0]?.next_version ?? 1;
  }

  async createProfileSnapshot(input: NewProfileSnapshot): Promise<ProfileSnapshot> {
    await this.pool.query(`
      insert into assessment.profile_snapshots (
        id, user_id, profile_version, segment, age_band, city, state, self_stage, wants_aid,
        intake_summary_json, result_summary_json, algorithm_version, snapshot_schema_version, payload_hash, created_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [input.id, input.userId, input.profileVersion, input.profile.segment, input.profile.ageBand, input.profile.city, input.profile.state, input.profile.selfStage, input.profile.wantsAid, input.intakeSummary, input.resultSummary, input.algorithmVersion, input.snapshotSchemaVersion, input.payloadHash, input.createdAt]);
    for (const sourceResult of input.sourceResults) {
      await this.pool.query(
        `insert into assessment.profile_snapshot_results (profile_snapshot_id, assessment_result_id, result_role, display_order) values ($1,$2,$3,$4)`,
        [input.id, sourceResult.resultId, sourceResult.role, sourceResult.displayOrder],
      );
    }
    return ProfileSnapshotSchema.parse({
      snapshotId: input.id,
      userId: input.userId,
      segment: input.profile.segment,
      ageBand: input.profile.ageBand,
      city: input.profile.city,
      state: input.profile.state,
      selfStage: input.profile.selfStage,
      wantsAid: input.profile.wantsAid,
      intakeSummary: input.intakeSummary,
      riasec: (input.resultSummary as { riasec?: unknown }).riasec,
      values: (input.resultSummary as { values?: unknown }).values,
      profileVersion: input.profileVersion,
      algorithmVersion: input.algorithmVersion,
      sourceResultIds: input.sourceResults.map((sourceResult) => sourceResult.resultId),
      createdAt: input.createdAt,
    });
  }
}
