import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  UpsertUserProfileRequestSchema,
  UserProfileResponseSchema,
  UuidSchema,
} from "@yuvanext/contracts";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { AssessmentApplicationError } from "../application/errors.js";
import type { UserProfileService } from "../application/user-profile-service.js";

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

export const registerUserProfileRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  service: UserProfileService,
): void => {
  registry.registerPath({
    method: "put",
    path: "/api/v1/journey-sessions/{sessionId}/user-profile",
    tags: ["Assessment"],
    summary: "Create or update the authenticated student's basic profile for a journey session",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
      body: {
        content: { "application/json": { schema: UpsertUserProfileRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "User profile stored",
        content: { "application/json": { schema: UserProfileResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      422: {
        description: "Student is not eligible for Phase A profile creation",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.put("/api/v1/journey-sessions/:sessionId/user-profile", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const body = UpsertUserProfileRequestSchema.parse(request.body);
      const profile = await service.upsertForSession({ sessionId, userId, profile: body });
      response.status(200).json({ profile });
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
    path: "/api/v1/journey-sessions/{sessionId}/user-profile",
    tags: ["Assessment"],
    summary: "Retrieve the authenticated student's basic profile for a journey session",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
    },
    responses: {
      200: {
        description: "User profile found",
        content: { "application/json": { schema: UserProfileResponseSchema } },
      },
      404: {
        description: "Journey session or user profile not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/journey-sessions/:sessionId/user-profile", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const profile = await service.getForSession({ sessionId, userId });
      response.status(200).json({ profile });
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });
};
