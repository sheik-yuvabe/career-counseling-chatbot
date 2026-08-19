import type {
  AuditEvent,
  EvaluationResultSummary,
  ResolvedEvaluationRunRequest,
  EvaluationRunResponse,
  EvaluationRunSummary,
} from "@yuvanext/contracts";

const syntheticCompletedAt = "2026-07-30T12:30:05.000Z";

export const syntheticEvaluationResults = [
  {
    caseId: "m1-scoring-vector-smoke",
    moduleCode: "m1",
    category: "scoring",
    severity: "blocking",
    status: "passed",
    durationMs: 12,
    failureCodes: [],
  },
  {
    caseId: "m2-ranking-determinism-smoke",
    moduleCode: "m2",
    category: "matching",
    severity: "blocking",
    status: "passed",
    durationMs: 18,
    failureCodes: [],
  },
  {
    caseId: "m3-grounding-source-smoke",
    moduleCode: "m3",
    category: "retrieval",
    severity: "blocking",
    status: "passed",
    durationMs: 15,
    failureCodes: [],
  },
  {
    caseId: "m4-privacy-grounding-smoke",
    moduleCode: "m4",
    category: "grounding",
    severity: "blocking",
    status: "passed",
    durationMs: 20,
    failureCodes: [],
  },
  {
    caseId: "m5-safety-tier-smoke",
    moduleCode: "m5-safety",
    category: "safety",
    severity: "blocking",
    status: "passed",
    durationMs: 10,
    failureCodes: [],
  },
  {
    caseId: "integrated-accessibility-placeholder",
    moduleCode: "integrated",
    category: "accessibility",
    severity: "warning",
    status: "passed",
    durationMs: 8,
    failureCodes: [],
  },
] as const satisfies readonly EvaluationResultSummary[];

function summarizeEvaluationRun(
  request: Pick<ResolvedEvaluationRunRequest, "idempotencyKey" | "runType" | "gitRevision" | "environment" | "requestedAt">,
  results: readonly EvaluationResultSummary[],
): EvaluationRunSummary {
  const blockingPassed = results.filter(
    (result) => result.severity === "blocking" && result.status === "passed",
  ).length;
  const blockingFailed = results.filter(
    (result) => result.severity === "blocking" && result.status !== "passed",
  ).length;
  const warnings = results.filter((result) => result.severity === "warning").length;

  return {
    runId: request.idempotencyKey,
    runType: request.runType,
    status: blockingFailed === 0 ? "passed" : "failed",
    gitRevision: request.gitRevision,
    environment: request.environment,
    blockingPassed,
    blockingFailed,
    warnings,
    startedAt: request.requestedAt,
    completedAt: syntheticCompletedAt,
  };
}

function createEvaluationAuditEvent(
  requestCorrelationId: string,
  run: EvaluationRunSummary,
): AuditEvent {
  return {
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
  };
}

export function runSyntheticEvaluation(request: ResolvedEvaluationRunRequest): EvaluationRunResponse {
  const run = summarizeEvaluationRun(request, syntheticEvaluationResults);
  return {
    run,
    results: [...syntheticEvaluationResults],
    auditEvent: createEvaluationAuditEvent(request.requestCorrelationId, run),
  };
}

export function getSyntheticEvaluationRun(runId: string): EvaluationRunResponse {
  const request: ResolvedEvaluationRunRequest = {
    idempotencyKey: runId,
    runType: "manual",
    gitRevision: "synthetic-git-revision",
    environment: "test",
    fixtureVersions: { synthetic: "v1" },
    requestedAt: "2026-07-30T12:30:00.000Z",
    requestCorrelationId: runId,
  };

  return runSyntheticEvaluation(request);
}
