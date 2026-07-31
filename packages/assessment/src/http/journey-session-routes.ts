import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  CreateJourneySessionRequestSchema,
  JourneySessionResponseSchema,
  UuidSchema,
} from "@yuvanext/contracts";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { AssessmentApplicationError } from "../application/errors.js";
import type { JourneySessionService } from "../application/journey-session-service.js";

const ActorHeaderSchema = z.object({ "x-yuvanext-user-id": UuidSchema });
const SessionParamsSchema = z.object({ sessionId: UuidSchema });

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

export const registerJourneySessionRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  service: JourneySessionService,
): void => {
  registry.registerPath({
    method: "post",
    path: "/api/v1/journey-sessions",
    tags: ["Assessment"],
    summary: "Create a product journey session for the authenticated student",
    request: {
      headers: ActorHeaderSchema,
      body: {
        content: { "application/json": { schema: CreateJourneySessionRequestSchema } },
      },
    },
    responses: {
      201: {
        description: "Journey session created",
        content: { "application/json": { schema: JourneySessionResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/journey-sessions", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const body = CreateJourneySessionRequestSchema.parse(request.body);
      const session = await service.create(userId, body);
      response.status(201).json({ session });
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/journey-sessions/{sessionId}",
    tags: ["Assessment"],
    summary: "Retrieve one journey session for the authenticated student",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
    },
    responses: {
      200: {
        description: "Journey session found",
        content: { "application/json": { schema: JourneySessionResponseSchema } },
      },
      404: {
        description: "Journey session not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/journey-sessions/:sessionId", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const session = await service.get(sessionId, userId);
      response.status(200).json({ session });
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/journey-sessions/{sessionId}/resume",
    tags: ["Assessment"],
    summary: "Resume an active or paused journey session",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
    },
    responses: {
      200: {
        description: "Journey session resumed",
        content: { "application/json": { schema: JourneySessionResponseSchema } },
      },
      409: {
        description: "Journey session cannot be resumed",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/journey-sessions/:sessionId/resume", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const session = await service.resume(sessionId, userId);
      response.status(200).json({ session });
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });
};
