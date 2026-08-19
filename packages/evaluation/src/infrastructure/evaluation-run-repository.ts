import type { Pool } from "pg";
import type {
  AuditEvent,
  EvaluationResultSummary,
  ResolvedEvaluationRunRequest,
  EvaluationRunResponse,
  EvaluationRunSummary,
} from "@yuvanext/contracts";
import { withTransaction } from "@yuvanext/database";
import { runSyntheticEvaluation } from "../domain/evaluation-runs.js";

type EvaluationRunRow = {
  completed_at: Date | string | null;
  environment: string;
  fixture_versions_json: unknown;
  git_revision: string;
  id: string;
  run_type: string;
  started_at: Date | string;
  status: string;
  summary_json: unknown;
};

type EvaluationResultRow = {
  case_key: string;
  category: string;
  duration_ms: number;
  failure_codes: string[] | null;
  module_code: string;
  severity: string | null;
  status: string;
};

export type EvaluationRunRepository = {
  getRun: (runId: string) => Promise<EvaluationRunResponse | undefined>;
  runEvaluation: (request: ResolvedEvaluationRunRequest) => Promise<EvaluationRunResponse>;
};

const syntheticCaseIds: Record<string, string> = {
  "m1-scoring-vector-smoke": "51111111-1111-4111-8111-111111111111",
  "m2-ranking-determinism-smoke": "51111111-1111-4111-8111-111111111112",
  "m3-grounding-source-smoke": "51111111-1111-4111-8111-111111111113",
  "m4-privacy-grounding-smoke": "51111111-1111-4111-8111-111111111114",
  "m5-safety-tier-smoke": "51111111-1111-4111-8111-111111111115",
  "integrated-accessibility-placeholder": "51111111-1111-4111-8111-111111111116",
};

const asIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const summaryValue = (
  summaryJson: unknown,
  key: "blockingFailed" | "blockingPassed" | "warnings",
): number =>
  summaryJson && typeof summaryJson === "object" && typeof (summaryJson as Record<string, unknown>)[key] === "number"
    ? ((summaryJson as Record<string, number>)[key] ?? 0)
    : 0;

const toRunSummary = (row: EvaluationRunRow): EvaluationRunSummary => ({
  runId: row.id,
  runType: row.run_type as EvaluationRunSummary["runType"],
  status: row.status as EvaluationRunSummary["status"],
  gitRevision: row.git_revision,
  environment: row.environment,
  blockingPassed: summaryValue(row.summary_json, "blockingPassed"),
  blockingFailed: summaryValue(row.summary_json, "blockingFailed"),
  warnings: summaryValue(row.summary_json, "warnings"),
  startedAt: asIsoString(row.started_at),
  completedAt: row.completed_at ? asIsoString(row.completed_at) : undefined,
});

const toResultSummary = (row: EvaluationResultRow): EvaluationResultSummary => ({
  caseId: row.case_key,
  moduleCode: row.module_code as EvaluationResultSummary["moduleCode"],
  category: row.category as EvaluationResultSummary["category"],
  severity: (row.severity ?? "blocking") as EvaluationResultSummary["severity"],
  status: row.status as EvaluationResultSummary["status"],
  durationMs: row.duration_ms,
  failureCodes: row.failure_codes ?? [],
});

const createEvaluationAuditEvent = (
  requestCorrelationId: string,
  run: EvaluationRunSummary,
): AuditEvent => ({
  id: requestCorrelationId,
  actorType: "service",
  actorId: null,
  action: "evaluation.run.complete",
  targetType: "evaluation_run",
  targetId: run.runId,
  requestCorrelationId,
  safeMetadata: {
    runType: run.runType,
    status: run.status,
    blockingPassed: run.blockingPassed,
    blockingFailed: run.blockingFailed,
    warnings: run.warnings,
  },
  ipHash: null,
  occurredAt: run.completedAt ?? run.startedAt,
});

export const createPostgresEvaluationRunRepository = (pool: Pool): EvaluationRunRepository => ({
  async runEvaluation(request) {
    const syntheticResponse = runSyntheticEvaluation(request);
    const { run, results, auditEvent } = syntheticResponse;

    return withTransaction(pool, async (client) => {
      const evaluationCaseIds = new Map<string, string>();

      for (const result of results) {
        const caseResult = await client.query<{ id: string }>(
          `
            insert into operations.evaluation_cases (
              id,
              case_key,
              version,
              module_code,
              category,
              severity,
              fixture_refs_json,
              input_json,
              expected_json,
              assertions_json,
              status,
              created_at
            )
            values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
            on conflict (case_key, version) do update set
              module_code = excluded.module_code,
              category = excluded.category,
              severity = excluded.severity,
              fixture_refs_json = excluded.fixture_refs_json,
              input_json = excluded.input_json,
              expected_json = excluded.expected_json,
              assertions_json = excluded.assertions_json,
              status = excluded.status
            returning id
          `,
          [
            syntheticCaseIds[result.caseId],
            result.caseId,
            "synthetic-poc-v1",
            result.moduleCode,
            result.category,
            result.severity,
            JSON.stringify({ source: "module-5-synthetic" }),
            JSON.stringify({ caseId: result.caseId }),
            JSON.stringify({ status: result.status }),
            JSON.stringify({ failureCodes: result.failureCodes }),
            "active",
            run.startedAt,
          ],
        );

        const caseRow = caseResult.rows[0];
        if (!caseRow) {
          throw new Error(`Evaluation case persistence did not return a row for ${result.caseId}.`);
        }

        evaluationCaseIds.set(result.caseId, caseRow.id);
      }

      const runResult = await client.query<EvaluationRunRow>(
        `
          insert into operations.evaluation_runs (
            id,
            run_type,
            git_revision,
            environment,
            fixture_versions_json,
            status,
            started_at,
            completed_at,
            summary_json
          )
          values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb)
          on conflict (id) do update set
            run_type = excluded.run_type,
            git_revision = excluded.git_revision,
            environment = excluded.environment,
            fixture_versions_json = excluded.fixture_versions_json,
            status = excluded.status,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            summary_json = excluded.summary_json
          returning *
        `,
        [
          run.runId,
          run.runType,
          run.gitRevision,
          run.environment,
          JSON.stringify(request.fixtureVersions),
          run.status,
          run.startedAt,
          run.completedAt,
          JSON.stringify({
            blockingPassed: run.blockingPassed,
            blockingFailed: run.blockingFailed,
            warnings: run.warnings,
          }),
        ],
      );

      for (const result of results) {
        const evaluationCaseId = evaluationCaseIds.get(result.caseId);
        if (!evaluationCaseId) {
          throw new Error(`Evaluation case id was not available for ${result.caseId}.`);
        }

        await client.query(
          `
            insert into operations.evaluation_results (
              id,
              evaluation_run_id,
              evaluation_case_id,
              status,
              actual_json,
              metrics_json,
              failure_codes,
              duration_ms,
              created_at
            )
            values (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
            on conflict (evaluation_run_id, evaluation_case_id) do update set
              status = excluded.status,
              actual_json = excluded.actual_json,
              metrics_json = excluded.metrics_json,
              failure_codes = excluded.failure_codes,
              duration_ms = excluded.duration_ms,
              created_at = excluded.created_at
          `,
          [
            run.runId,
            evaluationCaseId,
            result.status,
            JSON.stringify({ caseId: result.caseId, status: result.status }),
            JSON.stringify({ durationMs: result.durationMs }),
            result.failureCodes,
            result.durationMs,
            run.completedAt ?? run.startedAt,
          ],
        );
      }

      await client.query(
        `
          insert into operations.audit_events (
            id,
            actor_type,
            actor_id,
            action,
            target_type,
            target_id,
            request_correlation_id,
            safe_metadata_json,
            ip_hash,
            occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
          on conflict (id) do update set
            actor_type = excluded.actor_type,
            actor_id = excluded.actor_id,
            action = excluded.action,
            target_type = excluded.target_type,
            target_id = excluded.target_id,
            request_correlation_id = excluded.request_correlation_id,
            safe_metadata_json = excluded.safe_metadata_json,
            ip_hash = excluded.ip_hash,
            occurred_at = excluded.occurred_at
        `,
        [
          auditEvent.id,
          auditEvent.actorType,
          auditEvent.actorId,
          auditEvent.action,
          auditEvent.targetType,
          auditEvent.targetId,
          auditEvent.requestCorrelationId,
          JSON.stringify(auditEvent.safeMetadata),
          auditEvent.ipHash,
          auditEvent.occurredAt,
        ],
      );

      const runRow = runResult.rows[0];
      if (!runRow) {
        throw new Error("Evaluation run persistence did not return inserted row.");
      }

      return { run: toRunSummary(runRow), results, auditEvent };
    });
  },

  async getRun(runId) {
    return withTransaction(pool, async (client) => {
      const runResult = await client.query<EvaluationRunRow>(
        "select * from operations.evaluation_runs where id = $1",
        [runId],
      );
      const runRow = runResult.rows[0];

      if (!runRow) {
        return undefined;
      }

      const resultRows = await client.query<EvaluationResultRow>(
        `
          select
            evaluation_cases.case_key,
            evaluation_cases.module_code,
            evaluation_cases.category,
            evaluation_cases.severity,
            evaluation_results.status,
            evaluation_results.duration_ms,
            evaluation_results.failure_codes
          from operations.evaluation_results
          inner join operations.evaluation_cases
            on evaluation_cases.id = evaluation_results.evaluation_case_id
          where evaluation_results.evaluation_run_id = $1
          order by evaluation_cases.case_key
        `,
        [runId],
      );

      const run = toRunSummary(runRow);
      return {
        run,
        results: resultRows.rows.map(toResultSummary),
        auditEvent: createEvaluationAuditEvent(runId, run),
      };
    });
  },
});
