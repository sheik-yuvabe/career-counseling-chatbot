import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  RecommendationSetResponseSchema,
  UuidSchema,
  type RecommendationSetResponse,
} from "@yuvanext/contracts";
import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  RecommendationSetNotFoundError,
  type GetRecommendationSetCommand,
} from "../application/get-recommendation-set.js";

const RecommendationParamsSchema = z.object({ recommendationId: UuidSchema }).strict();

export type RecommendationSetService = {
  execute(command: GetRecommendationSetCommand): Promise<RecommendationSetResponse>;
};

export type ResolveRecommendationUserId = (request: Request) => Promise<string | null>;

export type RecommendationHttpDependencies = {
  getRecommendationSet?: RecommendationSetService;
  resolveUserId?: ResolveRecommendationUserId;
};

const sendError = (response: Response, status: number, code: string, message: string): void => {
  response.status(status).json({ code, message });
};

export const registerRecommendationRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: RecommendationHttpDependencies = {},
): void => {
  registry.registerPath({
    method: "get",
    path: "/api/v1/recommendations/{recommendationId}",
    tags: ["Recommendations"],
    summary: "Get an authenticated user's completed recommendation set",
    security: [{ bearerAuth: [] }],
    request: { params: RecommendationParamsSchema },
    responses: {
      200: {
        description: "Owned completed recommendation set",
        content: { "application/json": { schema: RecommendationSetResponseSchema } },
      },
      400: {
        description: "Invalid recommendation ID",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Recommendation set not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Recommendation service unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get(
    "/api/v1/recommendations/:recommendationId",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.getRecommendationSet || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "recommendations_unavailable",
          "The recommendation service is not configured.",
        );
        return;
      }
      const params = RecommendationParamsSchema.safeParse(request.params);
      if (!params.success) {
        sendError(response, 400, "invalid_request", "The recommendation ID is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response.status(200).json(
          RecommendationSetResponseSchema.parse(
            await dependencies.getRecommendationSet.execute({
              userId,
              recommendationId: params.data.recommendationId,
            }),
          ),
        );
      } catch (error) {
        if (error instanceof RecommendationSetNotFoundError) {
          sendError(response, 404, "recommendation_not_found", error.message);
          return;
        }
        next(error);
      }
    },
  );
};
