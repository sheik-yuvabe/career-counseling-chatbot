import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  AssessmentNextResponseSchema,
  AssessmentResponseSaveResponseSchema,
  AssessmentResultResponseSchema,
  AssessmentRunResponseSchema,
  AssessmentProfileSnapshotResponseSchema,
  StartAssessmentRunRequestSchema,
  SubmitAssessmentResponseRequestSchema,
  UuidSchema,
} from "@yuvanext/contracts";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { AssessmentApplicationError } from "../application/errors.js";
import type { AssessmentService } from "../application/assessment-service.js";

const ActorHeaderSchema = z.object({ "x-yuvanext-user-id": UuidSchema });
const SessionParamsSchema = z.object({ sessionId: UuidSchema });
const RunParamsSchema = z.object({ runId: UuidSchema });
const SnapshotParamsSchema = z.object({ sessionId: UuidSchema, runId: UuidSchema });

const getActorUserId = (headers: unknown): string => ActorHeaderSchema.parse(headers)["x-yuvanext-user-id"];

const sendError = (response: Parameters<RequestHandler>[1], error: unknown): void => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ code: "invalid_request", message: "Request validation failed." });
    return;
  }
  if (error instanceof AssessmentApplicationError) {
    response.status(error.statusCode).json({ code: error.code, message: error.message });
    return;
  }
  throw error;
};

export const registerAssessmentWorkflowRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  service: AssessmentService,
): void => {
  registry.registerPath({
    method: "post",
    path: "/api/v1/journey-sessions/{sessionId}/assessment-runs",
    tags: ["Assessment"],
    summary: "Start an assessment run for the authenticated student's session",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
      body: { content: { "application/json": { schema: StartAssessmentRunRequestSchema } } },
    },
    responses: {
      201: {
        description: "Assessment run started",
        content: { "application/json": { schema: AssessmentRunResponseSchema } },
      },
      409: { description: "Consent/session conflict", content: { "application/json": { schema: ApiErrorSchema } } },
    },
  });

  app.post("/api/v1/journey-sessions/:sessionId/assessment-runs", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const body = StartAssessmentRunRequestSchema.parse(request.body);
      const run = await service.startRun({ sessionId, userId, request: body });
      response.status(201).json({ run });
    } catch (error) {
      try { sendError(response, error); } catch (unhandled) { next(unhandled); }
    }
  });

  app.post("/api/v1/journey-sessions/:sessionId/work-values-runs", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const body = StartAssessmentRunRequestSchema.parse(request.body);
      const run = await service.startWorkValuesRun({ sessionId, userId, request: body });
      response.status(201).json({ run });
    } catch (error) {
      try { sendError(response, error); } catch (unhandled) { next(unhandled); }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assessment-runs/{runId}/next",
    tags: ["Assessment"],
    summary: "Get exact progress and next unanswered assessment batch",
    request: { headers: ActorHeaderSchema, params: RunParamsSchema },
    responses: {
      200: {
        description: "Next assessment batch",
        content: { "application/json": { schema: AssessmentNextResponseSchema } },
      },
    },
  });

  app.get("/api/v1/assessment-runs/:runId/next", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { runId } = RunParamsSchema.parse(request.params);
      response.status(200).json(await service.getNext({ runId, userId }));
    } catch (error) {
      try { sendError(response, error); } catch (unhandled) { next(unhandled); }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/assessment-runs/{runId}/responses",
    tags: ["Assessment"],
    summary: "Persist one assessment response idempotently",
    request: {
      headers: ActorHeaderSchema,
      params: RunParamsSchema,
      body: { content: { "application/json": { schema: SubmitAssessmentResponseRequestSchema } } },
    },
    responses: {
      200: {
        description: "Assessment response stored",
        content: { "application/json": { schema: AssessmentResponseSaveResponseSchema } },
      },
    },
  });

  app.put("/api/v1/assessment-runs/:runId/responses", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { runId } = RunParamsSchema.parse(request.params);
      const body = SubmitAssessmentResponseRequestSchema.parse(request.body);
      response.status(200).json(await service.submitResponse({ runId, userId, response: body }));
    } catch (error) {
      try { sendError(response, error); } catch (unhandled) { next(unhandled); }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assessment-runs/{runId}/score",
    tags: ["Assessment"],
    summary: "Deterministically score a completed assessment run",
    request: { headers: ActorHeaderSchema, params: RunParamsSchema },
    responses: {
      200: {
        description: "Assessment result",
        content: { "application/json": { schema: AssessmentResultResponseSchema } },
      },
    },
  });

  app.post("/api/v1/assessment-runs/:runId/score", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { runId } = RunParamsSchema.parse(request.params);
      const result = await service.scoreRun({ runId, userId });
      response.status(200).json({ result });
    } catch (error) {
      try { sendError(response, error); } catch (unhandled) { next(unhandled); }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/journey-sessions/{sessionId}/assessment-runs/{runId}/profile-snapshot",
    tags: ["Assessment"],
    summary: "Generate immutable ProfileSnapshot from completed intake and result",
    request: { headers: ActorHeaderSchema, params: SnapshotParamsSchema },
    responses: {
      201: {
        description: "ProfileSnapshot generated",
        content: { "application/json": { schema: AssessmentProfileSnapshotResponseSchema } },
      },
    },
  });

  app.post(
    "/api/v1/journey-sessions/:sessionId/assessment-runs/:runId/profile-snapshot",
    async (request, response, next) => {
      try {
        const userId = getActorUserId(request.headers);
        const { sessionId, runId } = SnapshotParamsSchema.parse(request.params);
        const snapshot = await service.buildProfileSnapshot({ sessionId, userId, runId });
        response.status(201).json({ snapshot });
      } catch (error) {
        try { sendError(response, error); } catch (unhandled) { next(unhandled); }
      }
    },
  );
};
