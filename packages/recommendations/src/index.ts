import type { ModuleDescriptor } from "@yuvanext/contracts";
export { createRecommendationService } from "./application/recommendation-service.js";
export { createPostgresRecommendationDataSource } from "./application/recommendation-data-source.js";
export {
  createInMemoryRecommendationStore,
  createPostgresRecommendationStore,
} from "./application/recommendation-store.js";
export { buildAidRecommendationSet, scoreAidSchemes } from "./domain/aid-recommendations.js";
export {
  buildCareerRecommendationSet,
  normalizeRiasecVector,
  partitionCareerRings,
  pearsonCorrelation,
  scoreCareers,
  stableHash,
} from "./domain/career-matching.js";
export {
  buildCollegeRecommendationSet,
  partitionCollegeRings,
  scoreColleges,
} from "./domain/college-recommendations.js";
export { buildPathwayRecommendationSet, scorePathways } from "./domain/pathway-recommendations.js";
export { buildPlanRecommendationSet, generatePlan } from "./domain/plan-generation.js";
export { buildStreamRecommendationSet, scoreStreams } from "./domain/stream-recommendations.js";
export { registerRecommendationRoutes } from "./http/recommendation-routes.js";
export type {
  AidRecommendationRequest,
  CareerRecommendationRequest,
  CollegeRecommendationRequest,
  PathwayRecommendationRequest,
  PlanGenerationRequest,
  RecommendationService,
  RecommendationServiceContext,
  StreamRecommendationRequest,
} from "./application/recommendation-service.js";
export type {
  RecommendationStore,
  StoredRecommendationSet,
} from "./application/recommendation-store.js";
export type {
  AidRecommendationInput,
  ScoredAidScheme,
  StoredFacts,
} from "./domain/aid-recommendations.js";
export type {
  CareerRecommendationInput,
  CounselorPriority,
  FeasibilityRule,
  ScoredCareer,
} from "./domain/career-matching.js";
export type {
  CollegeRecommendationInput,
  CollegeRings,
  ScoredCollege,
} from "./domain/college-recommendations.js";
export type {
  PathwayRecommendationInput,
  ScoredPathway,
} from "./domain/pathway-recommendations.js";
export type {
  GeneratedPlanItem,
  PlanGenerationInput,
  PlanTarget,
} from "./domain/plan-generation.js";
export type {
  ScoredStream,
  StreamRecommendationInput,
} from "./domain/stream-recommendations.js";

export const recommendationsModule: ModuleDescriptor = {
  code: "m2",
  name: "Recommendations",
  packageName: "@yuvanext/recommendations",
  status: "in_progress",
};
