import {
  AidRecommendationRouteRequestSchema,
  CareerRecommendationRouteRequestSchema,
  CollegeRecommendationRouteRequestSchema,
  PathwayRecommendationRouteRequestSchema,
  RecommendationReplayResultSchema,
  PlanRecommendationRouteRequestSchema,
  RecommendationSetSchema,
  StreamRecommendationRouteRequestSchema,
  type AidRecommendationRouteRequest,
  type CareerRecommendationRouteRequest,
  type CollegeRecommendationRouteRequest,
  type OpenAPIRegistry,
  type PathwayRecommendationRouteRequest,
  type PlanRecommendationRouteRequest,
  type StreamRecommendationRouteRequest,
} from "@yuvanext/contracts";
import type { Express, Request, Response } from "express";
import { createRecommendationService } from "../application/recommendation-service.js";
import { createInMemoryRecommendationStore } from "../application/recommendation-store.js";

const recommendationRouteStore = createInMemoryRecommendationStore();

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: unknown[] } };

type RequestSchema<T> = {
  safeParse(value: unknown): ParseResult<T>;
};

type RouteConfig<T> = {
  path: string;
  summary: string;
  schema: RequestSchema<T>;
  handler: (body: T) => unknown;
};

export const registerRecommendationRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
): void => {
  const service = createRecommendationService({ store: recommendationRouteStore });

  registerPostRoute<CareerRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/careers",
    summary: "Generate deterministic career recommendations",
    schema: CareerRecommendationRouteRequestSchema,
    handler: (body) =>
      service.recommendCareers({
        recommendationId: body.recommendationId,
        profile: body.profile,
        careers: body.careers,
        config: body.config,
        ...(body.feasibilityRules ? { feasibilityRules: body.feasibilityRules } : {}),
        ...(body.counselorPriorities ? { counselorPriorities: body.counselorPriorities } : {}),
        createdAt: body.createdAt,
      }),
  });

  registerPostRoute<StreamRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/streams",
    summary: "Generate deterministic stream recommendations",
    schema: StreamRecommendationRouteRequestSchema,
    handler: (body) => service.recommendStreams(body),
  });

  registerPostRoute<PathwayRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/pathways",
    summary: "Generate deterministic pathway recommendations",
    schema: PathwayRecommendationRouteRequestSchema,
    handler: (body) => service.recommendPathways(body),
  });

  registerPostRoute<CollegeRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/colleges",
    summary: "Generate deterministic college recommendations",
    schema: CollegeRecommendationRouteRequestSchema,
    handler: (body) =>
      service.recommendColleges({
        recommendationId: body.recommendationId,
        profile: body.profile,
        colleges: body.colleges,
        targetDisciplineIds: body.targetDisciplineIds,
        ...(body.selectedState ? { selectedState: body.selectedState } : {}),
        ...(body.neighboringStates ? { neighboringStates: body.neighboringStates } : {}),
        config: body.config,
        createdAt: body.createdAt,
      }),
  });

  registerPostRoute<AidRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/aid",
    summary: "Generate deterministic aid recommendations",
    schema: AidRecommendationRouteRequestSchema,
    handler: (body) => service.recommendAid(body),
  });

  registerPostRoute<PlanRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/plans",
    summary: "Generate deterministic plan from approved templates",
    schema: PlanRecommendationRouteRequestSchema,
    handler: (body) =>
      service.generatePlan({
        recommendationId: body.recommendationId,
        profile: body.profile,
        templates: body.templates,
        ...(body.target ? { target: body.target } : {}),
        config: body.config,
        createdAt: body.createdAt,
      }),
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/recommendations/{id}",
    tags: ["Recommendations"],
    summary: "Fetch a stored immutable recommendation set",
    request: {
      params: undefined,
    },
    responses: {
      200: {
        description: "Stored recommendation set",
        content: { "application/json": { schema: RecommendationSetSchema } },
      },
      404: { description: "Recommendation not found" },
    },
  });

  app.get("/api/v1/recommendations/:id", (request: Request, response: Response) => {
    const recommendation = service.getRecommendation(readRouteId(request));
    if (!recommendation) {
      response.status(404).json({
        code: "recommendation_not_found",
        message: "No recommendation set exists for the requested id.",
      });
      return;
    }

    response.status(200).json(recommendation);
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/recommendations/{id}/replay",
    tags: ["Recommendations"],
    summary: "Replay a stored recommendation and compare output hashes",
    request: {
      params: undefined,
    },
    responses: {
      200: {
        description: "Replay hash comparison",
        content: { "application/json": { schema: RecommendationReplayResultSchema } },
      },
      404: { description: "Recommendation not found" },
    },
  });

  app.post("/api/v1/recommendations/:id/replay", (request: Request, response: Response) => {
    const replay = service.replayRecommendation(readRouteId(request), new Date().toISOString());
    if (!replay) {
      response.status(404).json({
        code: "recommendation_not_found",
        message: "No recommendation set exists for the requested id.",
      });
      return;
    }

    response.status(200).json(replay);
  });
};

function readRouteId(request: Request): string {
  const id = request.params.id;
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}

function registerPostRoute<T>(
  app: Express,
  registry: OpenAPIRegistry,
  route: RouteConfig<T>,
): void {
  registry.registerPath({
    method: "post",
    path: route.path,
    tags: ["Recommendations"],
    summary: route.summary,
    request: {
      body: {
        content: {
          "application/json": {
            schema: route.schema as never,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Deterministic recommendation set",
        content: { "application/json": { schema: RecommendationSetSchema } },
      },
      400: { description: "Invalid recommendation request" },
    },
  });

  app.post(route.path, (request: Request, response: Response) => {
    const parsed = route.schema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        code: "invalid_recommendation_request",
        message: "The recommendation request body is invalid.",
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      response.status(200).json(route.handler(parsed.data));
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        response.status(409).json({
          code: "recommendation_already_exists",
          message: "Recommendation rows are immutable; use a new recommendationId to recalculate.",
        });
        return;
      }

      throw error;
    }
  });
}
