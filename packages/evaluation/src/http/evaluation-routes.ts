import {
  ApiErrorSchema,
  EvaluationRunPathParamsSchema,
  EvaluationRunRequestSchema,
  EvaluationRunResponseSchema,
  type EvaluationRunResponse,
  type OpenAPIRegistry,
} from "@yuvanext/contracts";
import type { Express } from "express";
import { getSyntheticEvaluationRun, runSyntheticEvaluation } from "../domain/evaluation-runs.js";
import type { EvaluationRunRepository } from "../infrastructure/evaluation-run-repository.js";

export type EvaluationRouteDependencies = {
  evaluationRunRepository?: EvaluationRunRepository;
};

export const registerEvaluationRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: EvaluationRouteDependencies = {},
): void => {
  registry.registerPath({
    method: "post",
    path: "/api/v1/internal/evaluations/run",
    tags: ["Evaluation"],
    summary: "Run a synthetic Module 5 evaluation suite",
    request: {
      body: {
        content: {
          "application/json": {
            schema: EvaluationRunRequestSchema,
          },
        },
      },
    },
    responses: {
      202: {
        description: "Evaluation run completed for synthetic POC fixtures",
        content: { "application/json": { schema: EvaluationRunResponseSchema } },
      },
      400: {
        description: "Invalid evaluation run request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/internal/evaluations/run", async (request, response) => {
    const parsedRequest = EvaluationRunRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      response.status(400).json({
        code: "invalid_evaluation_run_request",
        message: "Evaluation run request body is invalid.",
      });
      return;
    }

    const body: EvaluationRunResponse = dependencies.evaluationRunRepository
      ? await dependencies.evaluationRunRepository.runEvaluation(parsedRequest.data)
      : runSyntheticEvaluation(parsedRequest.data);

    response.status(202).json(EvaluationRunResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/internal/evaluations/{id}",
    tags: ["Evaluation"],
    summary: "Get a synthetic evaluation run result",
    request: {
      params: EvaluationRunPathParamsSchema,
    },
    responses: {
      200: {
        description: "Evaluation run result",
        content: { "application/json": { schema: EvaluationRunResponseSchema } },
      },
      400: {
        description: "Invalid evaluation run request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Evaluation run not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/internal/evaluations/:id", async (request, response) => {
    const parsedParams = EvaluationRunPathParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        code: "invalid_evaluation_run_request",
        message: "Evaluation run request is invalid.",
      });
      return;
    }

    const body: EvaluationRunResponse | undefined = dependencies.evaluationRunRepository
      ? await dependencies.evaluationRunRepository.getRun(parsedParams.data.id)
      : getSyntheticEvaluationRun(parsedParams.data.id);

    if (!body) {
      response.status(404).json({
        code: "evaluation_run_not_found",
        message: "Evaluation run was not found.",
      });
      return;
    }

    response.status(200).json(EvaluationRunResponseSchema.parse(body));
  });
};
