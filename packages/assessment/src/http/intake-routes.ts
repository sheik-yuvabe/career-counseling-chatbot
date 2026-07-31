import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  IntakeAnswerResponseSchema,
  IntakeQuestionsResponseSchema,
  UpsertIntakeAnswerRequestSchema,
  UuidSchema,
} from "@yuvanext/contracts";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { AssessmentApplicationError } from "../application/errors.js";
import type { IntakeService } from "../application/intake-service.js";

const ActorHeaderSchema = z.object({ "x-yuvanext-user-id": UuidSchema });
const SessionParamsSchema = z.object({ sessionId: UuidSchema });
const AnswerParamsSchema = z.object({ sessionId: UuidSchema, questionId: UuidSchema });
const IntakeQuerySchema = z.object({ language: z.string().min(2).max(16).default("en") });

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

export const registerIntakeRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  service: IntakeService,
): void => {
  registry.registerPath({
    method: "get",
    path: "/api/v1/journey-sessions/{sessionId}/intake/questions",
    tags: ["Assessment"],
    summary: "Get approved intake questions for the authenticated student's profile segment",
    request: {
      headers: ActorHeaderSchema,
      params: SessionParamsSchema,
      query: IntakeQuerySchema,
    },
    responses: {
      200: {
        description: "Intake questions found",
        content: { "application/json": { schema: IntakeQuestionsResponseSchema } },
      },
      404: {
        description: "Journey session, profile, or question set not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/journey-sessions/:sessionId/intake/questions", async (request, response, next) => {
    try {
      const userId = getActorUserId(request.headers);
      const { sessionId } = SessionParamsSchema.parse(request.params);
      const { language } = IntakeQuerySchema.parse(request.query);
      const body = await service.getQuestions({ sessionId, userId, language });
      response.status(200).json(body);
    } catch (error) {
      try {
        sendError(response, error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/journey-sessions/{sessionId}/intake/answers/{questionId}",
    tags: ["Assessment"],
    summary: "Create or update one intake answer for an adult student's journey session",
    request: {
      headers: ActorHeaderSchema,
      params: AnswerParamsSchema,
      body: {
        content: { "application/json": { schema: UpsertIntakeAnswerRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Intake answer stored",
        content: { "application/json": { schema: IntakeAnswerResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      409: {
        description: "Guardian consent is required for minor intake answer persistence",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.put(
    "/api/v1/journey-sessions/:sessionId/intake/answers/:questionId",
    async (request, response, next) => {
      try {
        const userId = getActorUserId(request.headers);
        const { sessionId, questionId } = AnswerParamsSchema.parse(request.params);
        const body = UpsertIntakeAnswerRequestSchema.parse(request.body);
        const answer = await service.upsertAnswer({ sessionId, userId, questionId, answer: body });
        response.status(200).json({ answer });
      } catch (error) {
        try {
          sendError(response, error);
        } catch (unhandled) {
          next(unhandled);
        }
      }
    },
  );
};
