import { describe, expect, it } from "vitest";
import request from "supertest";
import { EvaluationRunResponseSchema } from "@yuvanext/contracts";
import { z } from "zod";
import { createApp } from "../src/app/create-app.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const OpenApiPathsSchema = z.object({ paths: z.record(z.string(), z.unknown()) });

describe("evaluation routes", () => {
  it("runs an evaluation through the configured repository", async () => {
    const response = await request(
      createApp({
        evaluationRunRepository: {
          runEvaluation(parsedRequest) {
            return Promise.resolve({
              run: {
                runId: parsedRequest.idempotencyKey,
                runType: parsedRequest.runType,
                status: "passed",
                gitRevision: parsedRequest.gitRevision,
                environment: parsedRequest.environment,
                blockingPassed: 1,
                blockingFailed: 0,
                warnings: 0,
                startedAt: parsedRequest.requestedAt,
                completedAt: "2026-07-30T12:30:05.000Z",
              },
              results: [
                {
                  caseId: "m5-safety-tier-smoke",
                  moduleCode: "m5-safety",
                  category: "safety",
                  severity: "blocking",
                  status: "passed",
                  durationMs: 10,
                  failureCodes: [],
                },
              ],
              auditEvent: {
                id: parsedRequest.requestCorrelationId,
                actorType: "service",
                actorId: null,
                action: "evaluation.run.complete",
                targetType: "evaluation_run",
                targetId: parsedRequest.idempotencyKey,
                requestCorrelationId: parsedRequest.requestCorrelationId,
                safeMetadata: { repository: "fake" },
                ipHash: null,
                occurredAt: "2026-07-30T12:30:05.000Z",
              },
            });
          },
          getRun() {
            return Promise.resolve(undefined);
          },
        },
        logging: false,
      }),
    )
      .post("/api/v1/internal/evaluations/run")
      .send({
        idempotencyKey: uuid,
        runType: "manual",
        gitRevision: "abcdef123",
        environment: "test",
        fixtureVersions: {
          safety: "mock-safety-md-v1",
        },
        requestedAt: "2026-07-30T12:30:00.000Z",
        requestCorrelationId: uuid,
      });

    expect(response.status).toBe(202);
    const body = EvaluationRunResponseSchema.parse(response.body);
    expect(body.results).toHaveLength(1);
    expect(body.auditEvent.safeMetadata).toEqual({ repository: "fake" });
  });

  it("returns 404 when configured repository cannot find an evaluation run", async () => {
    const response = await request(
      createApp({
        evaluationRunRepository: {
          runEvaluation() {
            return Promise.reject(new Error("not used"));
          },
          getRun() {
            return Promise.resolve(undefined);
          },
        },
        logging: false,
      }),
    ).get(`/api/v1/internal/evaluations/${uuid}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: "evaluation_run_not_found",
      message: "Evaluation run was not found.",
    });
  });

  it("runs a synthetic evaluation suite", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/evaluations/run")
      .send({
        idempotencyKey: uuid,
        runType: "manual",
        gitRevision: "abcdef123",
        environment: "test",
        fixtureVersions: {
          safety: "mock-safety-md-v1",
        },
        requestedAt: "2026-07-30T12:30:00.000Z",
        requestCorrelationId: uuid,
      });

    expect(response.status).toBe(202);
    const body = EvaluationRunResponseSchema.parse(response.body);
    expect(body.run.status).toBe("passed");
    expect(body.run.blockingFailed).toBe(0);
    expect(body.results).toHaveLength(6);
  });

  it("gets a synthetic evaluation run", async () => {
    const response = await request(createApp({ logging: false })).get(
      `/api/v1/internal/evaluations/${uuid}`,
    );

    expect(response.status).toBe(200);
    expect(EvaluationRunResponseSchema.parse(response.body).run.runId).toBe(uuid);
  });

  it("returns 400 for invalid evaluation run requests", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/evaluations/run")
      .send({ runType: "manual" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_evaluation_run_request",
      message: "Evaluation run request body is invalid.",
    });
  });

  it("publishes evaluation endpoints in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/internal/evaluations/run"]).toBeDefined();
    expect(body.paths["/api/v1/internal/evaluations/{id}"]).toBeDefined();
  });
});
