import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  GuardianConsentResponseSchema,
  GuardianConsentStatusResponseSchema,
  RequestGuardianConsentRequestSchema,
  UuidSchema,
  VerifyGuardianConsentRequestSchema,
} from "@yuvanext/contracts";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { AssessmentApplicationError } from "../application/errors.js";
import type { GuardianConsentService } from "../application/guardian-consent-service.js";

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

export const registerGuardianConsentRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  service: GuardianConsentService,
): void => {
  registry.registerPath({
    method: "post",
    path: "/api/v1/journey-sessions/{sessionId}/guardian-consents",
    tags: ["Assessment"],
    summary: "Request guardian consent for a minor student profile",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
      body: {
        content: { "application/json": { schema: RequestGuardianConsentRequestSchema } },
      },
    },
    responses: {
      201: {
        description: "Guardian consent requested",
        content: { "application/json": { schema: GuardianConsentResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      409: {
        description: "Guardian consent is not required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/journey-sessions/:sessionId/guardian-consents", async (request, response, next) => {
    try {
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const userId = getActorUserId(request.headers);
      const body = RequestGuardianConsentRequestSchema.parse(request.body);
      const consent = await service.request({ sessionId, userId, consent: body });
      response.status(201).json({ consent });
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
    path: "/api/v1/journey-sessions/{sessionId}/guardian-consents/verify",
    tags: ["Assessment"],
    summary: "Verify a pending guardian consent OTP",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
      body: {
        content: { "application/json": { schema: VerifyGuardianConsentRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Guardian consent granted",
        content: { "application/json": { schema: GuardianConsentResponseSchema } },
      },
      400: {
        description: "Invalid or expired OTP",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/journey-sessions/:sessionId/guardian-consents/verify", async (request, response, next) => {
    try {
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const userId = getActorUserId(request.headers);
      const body = VerifyGuardianConsentRequestSchema.parse(request.body);
      const consent = await service.verify({ sessionId, userId, verification: body });
      response.status(200).json({ consent });
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
    path: "/api/v1/journey-sessions/{sessionId}/guardian-consents/status",
    tags: ["Assessment"],
    summary: "Get guardian consent status for the authenticated student",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
    },
    responses: {
      200: {
        description: "Guardian consent status",
        content: { "application/json": { schema: GuardianConsentStatusResponseSchema } },
      },
      404: {
        description: "User profile not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/journey-sessions/:sessionId/guardian-consents/status", async (request, response, next) => {
    try {
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const userId = getActorUserId(request.headers);
      const body = await service.getStatus({ sessionId, userId });
      response.status(200).json(body);
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });
};
