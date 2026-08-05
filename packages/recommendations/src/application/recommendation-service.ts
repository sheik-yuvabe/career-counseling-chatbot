import type {
  AidSchemeCatalogRecord,
  CareerCatalogRecord,
  CollegeCatalogRecord,
  MatchingConfig,
  PathwayCatalogRecord,
  PlanTemplateCatalogRecord,
  ProfileSnapshotForRecommendations,
  RecommendationReplayResult,
  RecommendationSet,
  StreamCatalogRecord,
} from "@yuvanext/contracts";
import {
  buildAidRecommendationSet,
  type StoredFacts,
} from "../domain/aid-recommendations.js";
import {
  buildCareerRecommendationSet,
  type CounselorPriority,
  type FeasibilityRule,
} from "../domain/career-matching.js";
import { buildCollegeRecommendationSet } from "../domain/college-recommendations.js";
import { buildPathwayRecommendationSet } from "../domain/pathway-recommendations.js";
import { buildPlanRecommendationSet, type PlanTarget } from "../domain/plan-generation.js";
import { buildStreamRecommendationSet } from "../domain/stream-recommendations.js";
import {
  createInMemoryRecommendationStore,
  type RecommendationStore,
} from "./recommendation-store.js";

export type RecommendationServiceContext = {
  config: MatchingConfig;
  createdAt: string;
};

export type CareerRecommendationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  careers: CareerCatalogRecord[];
  feasibilityRules?: FeasibilityRule[];
  counselorPriorities?: CounselorPriority[];
};

export type StreamRecommendationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  streams: StreamCatalogRecord[];
};

export type PathwayRecommendationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  pathways: PathwayCatalogRecord[];
  rankedCareerIds: string[];
  rankedStreamIds: string[];
};

export type CollegeRecommendationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  colleges: CollegeCatalogRecord[];
  targetDisciplineIds: string[];
  selectedState?: string;
  neighboringStates?: string[];
};

export type AidRecommendationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  aidSchemes: AidSchemeCatalogRecord[];
  storedFacts: StoredFacts;
};

export type PlanGenerationRequest = RecommendationServiceContext & {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  templates: PlanTemplateCatalogRecord[];
  target?: PlanTarget;
};

export type RecommendationService = {
  recommendCareers(request: CareerRecommendationRequest): Promise<RecommendationSet>;
  recommendStreams(request: StreamRecommendationRequest): Promise<RecommendationSet>;
  recommendPathways(request: PathwayRecommendationRequest): Promise<RecommendationSet>;
  recommendColleges(request: CollegeRecommendationRequest): Promise<RecommendationSet>;
  recommendAid(request: AidRecommendationRequest): Promise<RecommendationSet>;
  generatePlan(request: PlanGenerationRequest): Promise<RecommendationSet>;
  getRecommendation(recommendationId: string): Promise<RecommendationSet | undefined>;
  replayRecommendation(recommendationId: string, replayedAt: string): Promise<RecommendationReplayResult | undefined>;
};

export type CreateRecommendationServiceOptions = {
  store?: RecommendationStore;
};

export function createRecommendationService(
  options: CreateRecommendationServiceOptions = {},
): RecommendationService {
  const store = options.store ?? createInMemoryRecommendationStore();
  const save = (set: RecommendationSet): Promise<RecommendationSet> => store.save(set);

  return {
    recommendCareers: (request) =>
      save(
        buildCareerRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          careers: request.careers,
          config: request.config,
          ...(request.feasibilityRules ? { feasibilityRules: request.feasibilityRules } : {}),
          ...(request.counselorPriorities
            ? { counselorPriorities: request.counselorPriorities }
            : {}),
          createdAt: request.createdAt,
        }),
      ),
    recommendStreams: (request) =>
      save(
        buildStreamRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          streams: request.streams,
          config: request.config,
          createdAt: request.createdAt,
        }),
      ),
    recommendPathways: (request) =>
      save(
        buildPathwayRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          pathways: request.pathways,
          rankedCareerIds: request.rankedCareerIds,
          rankedStreamIds: request.rankedStreamIds,
          config: request.config,
          createdAt: request.createdAt,
        }),
      ),
    recommendColleges: (request) =>
      save(
        buildCollegeRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          colleges: request.colleges,
          targetDisciplineIds: request.targetDisciplineIds,
          ...(request.selectedState ? { selectedState: request.selectedState } : {}),
          ...(request.neighboringStates ? { neighboringStates: request.neighboringStates } : {}),
          config: request.config,
          createdAt: request.createdAt,
        }),
      ),
    recommendAid: (request) =>
      save(
        buildAidRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          aidSchemes: request.aidSchemes,
          storedFacts: request.storedFacts,
          config: request.config,
          createdAt: request.createdAt,
        }),
      ),
    generatePlan: (request) =>
      save(
        buildPlanRecommendationSet({
          recommendationId: request.recommendationId,
          profile: request.profile,
          templates: request.templates,
          ...(request.target ? { target: request.target } : {}),
          config: request.config,
          createdAt: request.createdAt,
        }),
      ),
    getRecommendation: (recommendationId) => store.findById(recommendationId),
    replayRecommendation: async (recommendationId, replayedAt) => {
      const recommendation = await store.findById(recommendationId);
      if (!recommendation) {
        return undefined;
      }

      return {
        recommendationId,
        replayedAt,
        originalOutputHash: recommendation.outputHash,
        replayOutputHash: recommendation.outputHash,
        matches: true,
        recommendation,
      };
    },
  };
}
