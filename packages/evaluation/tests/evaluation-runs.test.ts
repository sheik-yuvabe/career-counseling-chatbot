import { describe, expect, it } from "vitest";
import { EvaluationRunResponseSchema, type EvaluationRunRequest } from "@yuvanext/contracts";
import { getSyntheticEvaluationRun, runSyntheticEvaluation } from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";

const request: EvaluationRunRequest = {
  idempotencyKey: uuid,
  runType: "manual",
  gitRevision: "abcdef123",
  environment: "test",
  fixtureVersions: {
    safety: "mock-safety-md-v1",
  },
  requestedAt: "2026-07-30T12:30:00.000Z",
  requestCorrelationId: uuid,
};

describe("synthetic evaluation runs", () => {
  it("returns a passing run summary and module results", () => {
    const response = runSyntheticEvaluation(request);

    expect(EvaluationRunResponseSchema.parse(response).run).toMatchObject({
      runId: uuid,
      status: "passed",
      blockingFailed: 0,
      warnings: 1,
    });
    expect(response.results.map((result) => result.moduleCode)).toContain("m5-safety");
  });

  it("returns a synthetic stored run result", () => {
    const response = getSyntheticEvaluationRun(uuid);

    expect(response.run.runId).toBe(uuid);
    expect(response.auditEvent.action).toBe("evaluation.run.complete");
  });
});
