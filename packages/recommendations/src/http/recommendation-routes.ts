import { randomUUID } from "node:crypto";
import {
  AidRecommendationRouteRequestSchema,
  AidRecommendationSetResponseSchema,
  CareerRecommendationRouteRequestSchema,
  CareerRecommendationSetResponseSchema,
  CollegeRecommendationRouteRequestSchema,
  CollegeRecommendationSetResponseSchema,
  PathwayRecommendationRouteRequestSchema,
  PathwayRecommendationSetResponseSchema,
  RecommendationReplayResultSchema,
  RecommendationIdParamsSchema,
  PlanRecommendationRouteRequestSchema,
  PlanRecommendationSetResponseSchema,
  RecommendationSetSchema,
  StreamRecommendationRouteRequestSchema,
  StreamRecommendationSetResponseSchema,
  UuidSchema,
  type AidRecommendationRouteRequest,
  type CareerRecommendationRouteRequest,
  type CollegeRecommendationRouteRequest,
  type OpenAPIRegistry,
  type PathwayRecommendationRouteRequest,
  type PlanRecommendationRouteRequest,
  type RecommendationSet,
  type StreamRecommendationRouteRequest,
} from "@yuvanext/contracts";
import type { Express, Request, Response } from "express";
import type { RecommendationDataSource } from "../application/recommendation-data-source.js";
import type { RecommendationStore } from "../application/recommendation-store.js";
import { createRecommendationService } from "../application/recommendation-service.js";

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
  responseSchema: unknown;
  responseExample: unknown;
  responseMapper: (recommendation: RecommendationSet) => unknown;
  handler: (body: T) => Promise<RecommendationSet>;
};

type ProfileResolvableBody = {
  profile?: CareerRecommendationRouteRequest["profile"] | undefined;
  profileSnapshotId?: string | undefined;
};

type ConfigResolvableBody = {
  config?: CareerRecommendationRouteRequest["config"] | undefined;
};

export type RegisterRecommendationRoutesOptions = {
  store: RecommendationStore;
  dataSource?: RecommendationDataSource;
  registerReadRoute?: boolean;
};

export const registerRecommendationRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  options: RegisterRecommendationRoutesOptions,
): void => {
  const service = createRecommendationService({ store: options.store });

  registerPostRoute<CareerRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/careers",
    summary: "Generate deterministic career recommendations",
    schema: CareerRecommendationRouteRequestSchema,
    responseSchema: CareerRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("careerRecommendationId", "career", "Software Developer"),
    responseMapper: renameRecommendationId("careerRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      const config = await resolveConfig(body, options.dataSource, "career_match");
      return service.recommendCareers({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        // Rank the complete published catalogue. Limiting before scoring could
        // discard the student's best matches merely because they sort later.
        careers: body.careers ?? (await requireDataSource(options.dataSource).loadCareers()),
        config,
        ...(body.feasibilityRules
          ? { feasibilityRules: body.feasibilityRules }
          : options.dataSource
            ? { feasibilityRules: await options.dataSource.loadFeasibilityRules(config) }
            : {}),
        ...(body.counselorPriorities ? { counselorPriorities: body.counselorPriorities } : {}),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  registerPostRoute<StreamRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/streams",
    summary: "Generate deterministic stream recommendations",
    schema: StreamRecommendationRouteRequestSchema,
    responseSchema: StreamRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("streamRecommendationId", "stream", "Computer Science"),
    responseMapper: renameRecommendationId("streamRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      return service.recommendStreams({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        streams: body.streams ?? (await requireDataSource(options.dataSource).loadStreams(profile, body.limit)),
        config: await resolveConfig(body, options.dataSource, "stream_rank"),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  registerPostRoute<PathwayRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/pathways",
    summary: "Generate deterministic pathway recommendations",
    schema: PathwayRecommendationRouteRequestSchema,
    responseSchema: PathwayRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("pathwayRecommendationId", "pathway", "B.Sc Computer Science"),
    responseMapper: renameRecommendationId("pathwayRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      const profileSnapshotId = profile.profileSnapshotId;
      return service.recommendPathways({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        pathways: body.pathways ?? (await requireDataSource(options.dataSource).loadPathways(body.limit)),
        rankedCareerIds:
          body.rankedCareerIds ??
          (await requireDataSource(options.dataSource).loadLatestRankedEntityIds(profileSnapshotId, "career")),
        rankedStreamIds:
          body.rankedStreamIds ??
          (await requireDataSource(options.dataSource).loadLatestRankedEntityIds(profileSnapshotId, "stream")),
        config: await resolveConfig(body, options.dataSource, "pathway_rank"),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  registerPostRoute<CollegeRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/colleges",
    summary: "Generate deterministic college recommendations",
    schema: CollegeRecommendationRouteRequestSchema,
    responseSchema: CollegeRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("collegeRecommendationId", "college", "Government Arts College"),
    responseMapper: renameRecommendationId("collegeRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      const targetPathwayId =
        body.targetPathwayId ??
        (await requireDataSource(options.dataSource).loadLatestRankedEntityIds(profile.profileSnapshotId, "pathway"))[0];
      return service.recommendColleges({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        colleges: body.colleges ?? (await requireDataSource(options.dataSource).loadColleges(body.limit)),
        targetDisciplineIds:
          body.targetDisciplineIds ??
          (await requireDataSource(options.dataSource).loadTargetDisciplineIds(targetPathwayId)),
        ...(body.selectedState ? { selectedState: body.selectedState } : {}),
        ...(body.neighboringStates ? { neighboringStates: body.neighboringStates } : {}),
        config: await resolveConfig(body, options.dataSource, "college_rank"),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  registerPostRoute<AidRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/aid",
    summary: "Generate deterministic aid recommendations",
    schema: AidRecommendationRouteRequestSchema,
    responseSchema: AidRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("aidRecommendationId", "aid", "State Scholarship"),
    responseMapper: renameRecommendationId("aidRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      return service.recommendAid({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        aidSchemes: body.aidSchemes ?? (await requireDataSource(options.dataSource).loadAidSchemes(body.limit)),
        storedFacts: body.storedFacts ?? requireDataSource(options.dataSource).loadStoredFacts(profile),
        config: await resolveConfig(body, options.dataSource, "aid_rank"),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  registerPostRoute<PlanRecommendationRouteRequest>(app, registry, {
    path: "/api/v1/recommendations/plans",
    summary: "Generate deterministic plan from approved templates",
    schema: PlanRecommendationRouteRequestSchema,
    responseSchema: PlanRecommendationSetResponseSchema,
    responseExample: recommendationResponseExample("planRecommendationId", "plan", "90 day action plan"),
    responseMapper: renameRecommendationId("planRecommendationId"),
    handler: async (body) => {
      const profile = await resolveProfile(body, options.dataSource);
      return service.generatePlan({
        recommendationId: resolveRecommendationId(body.recommendationId),
        profile,
        templates: body.templates ?? (await requireDataSource(options.dataSource).loadPlanTemplates(body.limit)),
        ...(body.target ? { target: body.target } : {}),
        config: await resolveConfig(body, options.dataSource, "plan_generation"),
        createdAt: resolveCreatedAt(body.createdAt),
      });
    },
  });

  if (options.registerReadRoute !== false) {
    registry.registerPath({
      method: "get",
      path: "/api/v1/recommendations/{id}",
      tags: ["Recommendations"],
      summary: "Fetch a stored immutable recommendation set",
      request: {
        params: RecommendationIdParamsSchema,
      },
      responses: {
        200: {
          description: "Stored recommendation set",
          content: {
            "application/json": {
              schema: RecommendationSetSchema,
              example: storedRecommendationExample(),
            },
          },
        },
        404: { description: "Recommendation not found" },
      },
    });

    app.get("/api/v1/recommendations/:id", async (request: Request, response: Response) => {
      const recommendationId = readRecommendationRouteId(request, response);
      if (!recommendationId) {
        return;
      }

      const recommendation = await service.getRecommendation(recommendationId);
      if (!recommendation) {
        response.status(404).json({
          code: "recommendation_not_found",
          message: "No recommendation set exists for the requested id.",
        });
        return;
      }

      response.status(200).json(recommendation);
    });
  }

  registry.registerPath({
    method: "post",
    path: "/api/v1/recommendations/{id}/replay",
    tags: ["Recommendations"],
    summary: "Replay a stored recommendation and compare output hashes",
    request: {
      params: RecommendationIdParamsSchema,
    },
    responses: {
      200: {
        description: "Replay hash comparison",
        content: {
          "application/json": {
            schema: RecommendationReplayResultSchema,
            example: replayResponseExample(),
          },
        },
      },
      404: { description: "Recommendation not found" },
    },
  });

  app.post("/api/v1/recommendations/:id/replay", async (request: Request, response: Response) => {
    const recommendationId = readRecommendationRouteId(request, response);
    if (!recommendationId) {
      return;
    }

    const replay = await service.replayRecommendation(recommendationId, new Date().toISOString());
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

function readRecommendationRouteId(request: Request, response: Response): string | undefined {
  const id = readRouteId(request);
  const parsed = UuidSchema.safeParse(id);
  if (parsed.success) {
    return parsed.data;
  }

  response.status(400).json({
    code: "invalid_recommendation_id",
    message: "Use the actual recommendation id returned by the POST endpoint, not {id} or profileSnapshotId.",
  });
  return undefined;
}

function resolveRecommendationId(recommendationId: string | undefined): string {
  return recommendationId ?? randomUUID();
}

async function resolveProfile(
  body: ProfileResolvableBody,
  dataSource: RecommendationDataSource | undefined,
): Promise<NonNullable<CareerRecommendationRouteRequest["profile"]>> {
  if (body.profile) {
    return body.profile;
  }

  if (!body.profileSnapshotId) {
    throw new Error("profileSnapshotId is required when profile is not provided");
  }

  return requireDataSource(dataSource).loadProfile(body.profileSnapshotId);
}

async function resolveConfig(
  body: ConfigResolvableBody,
  dataSource: RecommendationDataSource | undefined,
  configurationKey: string,
): Promise<NonNullable<CareerRecommendationRouteRequest["config"]>> {
  return body.config ?? requireDataSource(dataSource).loadActiveConfig(configurationKey);
}

function resolveCreatedAt(createdAt: string | undefined): string {
  return createdAt ?? new Date().toISOString();
}

function requireDataSource(dataSource: RecommendationDataSource | undefined): RecommendationDataSource {
  if (!dataSource) {
    throw new Error("Recommendation data source is required when request omits profile/config/catalog payloads");
  }

  return dataSource;
}

function renameRecommendationId(idKey: string): (recommendation: RecommendationSet) => unknown {
  return (recommendation) => {
    const { recommendationId, ...rest } = recommendation;
    return { [idKey]: recommendationId, ...rest };
  };
}

function minimalRequestExample(): unknown {
  return {
    profileSnapshotId: "345cdb3e-392a-4fec-814a-fcece35d99ad",
    limit: 18,
  };
}

function recommendationResponseExample(idKey: string, kind: RecommendationSet["kind"], title: string): unknown {
  const recommendationId = "45cb022c-fea1-409b-afdf-82bff3ef82f2";
  const stored = storedRecommendationExample(kind, title) as Omit<RecommendationSet, "recommendationId"> & {
    recommendationId?: string;
  };
  delete stored.recommendationId;
  return {
    [idKey]: recommendationId,
    ...stored,
  };
}

function storedRecommendationExample(
  kind: RecommendationSet["kind"] = "career",
  title = "Software Developer",
): RecommendationSet {
  return {
    recommendationId: "45cb022c-fea1-409b-afdf-82bff3ef82f2",
    profileSnapshotId: "345cdb3e-392a-4fec-814a-fcece35d99ad",
    kind,
    items: [
      {
        itemId: `${kind}:3fa85f64-5717-4562-b3fc-2c963f66afa6`,
        entityType: kind,
        entityId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        title,
        rank: 1,
        explanation: {
          reason: "Matched with the profile snapshot and verified catalog data.",
        },
        entityDatasetVersion: "2026-07-30",
      },
    ],
    algorithmVersion: "module-2-live-v1",
    weightsVersion: "module-2-live-default-weights-v1",
    sourceDataVersions: { [kind]: "2026-07-30" },
    inputHash: "input-hash",
    outputHash: "output-hash",
    createdAt: "2026-08-05T10:55:57.083Z",
  };
}

function replayResponseExample(): unknown {
  const recommendation = storedRecommendationExample();
  return {
    recommendationId: recommendation.recommendationId,
    replayedAt: "2026-08-05T10:55:57.083Z",
    originalOutputHash: "output-hash",
    replayOutputHash: "output-hash",
    matches: true,
    recommendation,
  };
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
            example: minimalRequestExample(),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Deterministic recommendation set",
        content: {
          "application/json": {
            schema: route.responseSchema as never,
            example: route.responseExample,
          },
        },
      },
      400: { description: "Invalid recommendation request" },
    },
  });

  app.post(route.path, async (request: Request, response: Response) => {
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
      const recommendation = await route.handler(parsed.data);
      response.status(200).json(route.responseMapper(recommendation));
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        response.status(409).json({
          code: "recommendation_already_exists",
          message: "Recommendation rows are immutable; use a new recommendationId to recalculate.",
        });
        return;
      }

      if (error instanceof Error && error.message.includes("was not found")) {
        response.status(404).json({
          code: "recommendation_dependency_not_found",
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes("No matching configuration found")) {
        response.status(422).json({
          code: "recommendation_configuration_not_found",
          message: error.message,
        });
        return;
      }

      throw error;
    }
  });
}
