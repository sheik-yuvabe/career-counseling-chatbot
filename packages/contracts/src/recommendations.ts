import { z } from "zod";
import { IsoTimestampSchema, SegmentSchema, StateSchema, UuidSchema } from "./common.js";

export const RiasecLetterSchema = z.enum(["R", "I", "A", "S", "E", "C"]);
export type RiasecLetter = z.infer<typeof RiasecLetterSchema>;

export const RiasecVectorSchema = z.object({
  R: z.number(),
  I: z.number(),
  A: z.number(),
  S: z.number(),
  E: z.number(),
  C: z.number(),
});
export type RiasecVector = z.infer<typeof RiasecVectorSchema>;

export const ProfileSnapshotForRecommendationsSchema = z.object({
  profileSnapshotId: UuidSchema,
  profileVersion: z.string().min(1),
  profileHash: z.string().min(1),
  segment: SegmentSchema,
  state: StateSchema.optional(),
  marksBand: z.string().min(1).optional(),
  riasec: RiasecVectorSchema,
  workValues: RiasecVectorSchema.optional(),
});
export type ProfileSnapshotForRecommendations = z.infer<
  typeof ProfileSnapshotForRecommendationsSchema
>;

export const MatchingConfigSchema = z.object({
  algorithmVersion: z.string().min(1),
  weightsVersion: z.string().min(1),
  interestWeight: z.number().min(0).max(1),
  valuesWeight: z.number().min(0).max(1),
  feasibilityWeight: z.number().min(0).max(1),
  contextWeight: z.number().min(0).max(1),
  roundingScale: z.number().int().min(0).max(8),
  feasibilityLookupVersion: z.string().min(1),
  riasecTieOrder: z.tuple([
    RiasecLetterSchema,
    RiasecLetterSchema,
    RiasecLetterSchema,
    RiasecLetterSchema,
    RiasecLetterSchema,
    RiasecLetterSchema,
  ]),
});
export type MatchingConfig = z.infer<typeof MatchingConfigSchema>;

export const CareerCatalogRecordSchema = z.object({
  careerId: UuidSchema,
  title: z.string().trim().min(1),
  riasec: RiasecVectorSchema,
  workValues: RiasecVectorSchema.optional(),
  routeIds: z.array(UuidSchema).min(1),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
  isVocationalRoute: z.boolean().default(false),
});
export type CareerCatalogRecord = z.infer<typeof CareerCatalogRecordSchema>;

export const StreamCatalogRecordSchema = z.object({
  streamId: UuidSchema,
  title: z.string().trim().min(1),
  riasecLetters: z.array(RiasecLetterSchema).min(1),
  recommendedSegments: z.array(SegmentSchema).min(1),
  marksBands: z.array(z.string().min(1)).optional(),
  priority: z.number().int().nonnegative().default(100),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
});
export type StreamCatalogRecord = z.infer<typeof StreamCatalogRecordSchema>;

export const PathwayCatalogRecordSchema = z.object({
  pathwayId: UuidSchema,
  title: z.string().trim().min(1),
  careerIds: z.array(UuidSchema).min(1),
  streamIds: z.array(UuidSchema).min(1),
  recommendedSegments: z.array(SegmentSchema).min(1),
  marksBands: z.array(z.string().min(1)).optional(),
  reachability: z.number().min(0).max(1),
  hasBackupRoute: z.boolean(),
  priority: z.number().int().nonnegative().default(100),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
});
export type PathwayCatalogRecord = z.infer<typeof PathwayCatalogRecordSchema>;

export const CollegeCatalogRecordSchema = z.object({
  collegeId: UuidSchema,
  title: z.string().trim().min(1),
  disciplineIds: z.array(UuidSchema).min(1),
  state: StateSchema,
  tier: z.number().int().positive(),
  collegeType: z.enum(["regular", "vocational", "polytechnic", "iti", "open_university"]),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
});
export type CollegeCatalogRecord = z.infer<typeof CollegeCatalogRecordSchema>;

export const AidCriterionSchema = z.object({
  factKey: z.string().trim().min(1),
  acceptedValues: z.array(z.string().trim().min(1)).optional(),
});
export type AidCriterion = z.infer<typeof AidCriterionSchema>;

export const AidSchemeCatalogRecordSchema = z.object({
  aidSchemeId: UuidSchema,
  title: z.string().trim().min(1),
  criteria: z.array(AidCriterionSchema).min(1),
  priority: z.number().int().nonnegative().default(100),
  sourceUrl: z.string().url().optional(),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
});
export type AidSchemeCatalogRecord = z.infer<typeof AidSchemeCatalogRecordSchema>;

export const PlanTemplateStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  timeWindow: z.string().trim().min(1),
  actionTemplate: z.string().trim().min(1),
  isOptional: z.boolean().default(false),
});
export type PlanTemplateStep = z.infer<typeof PlanTemplateStepSchema>;

export const PlanTemplateCatalogRecordSchema = z.object({
  planTemplateId: UuidSchema,
  title: z.string().trim().min(1),
  segment: SegmentSchema,
  planType: z.enum(["exploration", "pathway", "career_90_day"]),
  targetEntityType: z.enum(["career", "stream", "pathway"]).optional(),
  priority: z.number().int().nonnegative().default(100),
  steps: z.array(PlanTemplateStepSchema).min(1),
  datasetVersion: z.string().min(1),
  verified: z.literal(true),
});
export type PlanTemplateCatalogRecord = z.infer<typeof PlanTemplateCatalogRecordSchema>;

export const CareerFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  interestFit: z.number().min(0).max(1),
  valuesFit: z.number().min(0).max(1).optional(),
  feasibility: z.number().min(0).max(1),
  contextBoost: z.number().min(0).max(1),
  weights: z.object({
    interest: z.number().min(0).max(1),
    values: z.number().min(0).max(1),
    feasibility: z.number().min(0).max(1),
    context: z.number().min(0).max(1),
  }),
  topMatchingScales: z.array(RiasecLetterSchema),
  tradeoffKey: z.string().nullable(),
});
export type CareerFitExplanation = z.infer<typeof CareerFitExplanationSchema>;

export const StreamFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  riasecOverlap: z.number().min(0).max(1),
  segmentFit: z.number().min(0).max(1),
  marksFit: z.number().min(0).max(1),
  catalogPriority: z.number().int().nonnegative(),
  topStudentLetters: z.array(RiasecLetterSchema),
  matchedLetters: z.array(RiasecLetterSchema),
});
export type StreamFitExplanation = z.infer<typeof StreamFitExplanationSchema>;

export const PathwayFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  careerAlignment: z.number().min(0).max(1),
  streamAlignment: z.number().min(0).max(1),
  segmentFit: z.number().min(0).max(1),
  marksFit: z.number().min(0).max(1),
  reachability: z.number().min(0).max(1),
  backupRouteFit: z.number().min(0).max(1),
  catalogPriority: z.number().int().nonnegative(),
  matchedCareerIds: z.array(UuidSchema),
  matchedStreamIds: z.array(UuidSchema),
});
export type PathwayFitExplanation = z.infer<typeof PathwayFitExplanationSchema>;

export const CollegeFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  disciplineAlignment: z.number().min(0).max(1),
  tierFit: z.number().min(0).max(1),
  stateFit: z.number().min(0).max(1),
  accessRouteFit: z.number().min(0).max(1),
  matchedDisciplineIds: z.array(UuidSchema),
  stateBand: z.enum(["selected", "neighboring", "other"]),
  collegeType: z.enum(["regular", "vocational", "polytechnic", "iti", "open_university"]),
});
export type CollegeFitExplanation = z.infer<typeof CollegeFitExplanationSchema>;

export const AidLikelihoodLabelSchema = z.enum(["likely", "check_conditions", "explore"]);
export type AidLikelihoodLabel = z.infer<typeof AidLikelihoodLabelSchema>;

export const AidFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  likelihoodLabel: AidLikelihoodLabelSchema,
  knownMatchedFactKeys: z.array(z.string()),
  unknownFactKeys: z.array(z.string()),
  mismatchedFactKeys: z.array(z.string()),
  evidenceScore: z.number().min(0).max(1),
  catalogPriority: z.number().int().nonnegative(),
  sourceUrl: z.string().url().optional(),
});
export type AidFitExplanation = z.infer<typeof AidFitExplanationSchema>;

export const GeneratedPlanStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  timeWindow: z.string().min(1),
  actionText: z.string().min(1),
  isOptional: z.boolean(),
});
export type GeneratedPlanStep = z.infer<typeof GeneratedPlanStepSchema>;

export const PlanFitExplanationSchema = z.object({
  schemaVersion: z.literal(1),
  templateId: UuidSchema,
  planType: z.enum(["exploration", "pathway", "career_90_day"]),
  segment: SegmentSchema,
  targetEntityType: z.enum(["career", "stream", "pathway"]).optional(),
  targetEntityId: UuidSchema.optional(),
  catalogPriority: z.number().int().nonnegative(),
  generatedSteps: z.array(GeneratedPlanStepSchema),
});
export type PlanFitExplanation = z.infer<typeof PlanFitExplanationSchema>;

export const RecommendationItemSchema = z.object({
  itemId: z.string().min(1),
  entityType: z.enum(["career", "stream", "pathway", "college", "aid", "plan"]),
  entityId: UuidSchema,
  title: z.string().min(1),
  rank: z.number().int().positive(),
  fitScore: z.number().min(0).max(1).optional(),
  ring: z.enum(["inner", "middle", "outer"]).optional(),
  explanation: CareerFitExplanationSchema.or(StreamFitExplanationSchema)
    .or(PathwayFitExplanationSchema)
    .or(CollegeFitExplanationSchema)
    .or(AidFitExplanationSchema)
    .or(PlanFitExplanationSchema)
    .or(z.record(z.string(), z.unknown())),
  entityDatasetVersion: z.string().min(1),
});
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const RecommendationSetSchema = z.object({
  recommendationId: UuidSchema,
  profileSnapshotId: UuidSchema,
  kind: z.enum(["career", "stream", "pathway", "college", "aid", "plan"]),
  items: z.array(RecommendationItemSchema),
  rings: z
    .object({
      inner: z.array(RecommendationItemSchema),
      middle: z.array(RecommendationItemSchema),
      outer: z.array(RecommendationItemSchema),
    })
    .optional(),
  algorithmVersion: z.string().min(1),
  weightsVersion: z.string().min(1),
  sourceDataVersions: z.record(z.string(), z.string()),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1),
  createdAt: IsoTimestampSchema,
});
export type RecommendationSet = z.infer<typeof RecommendationSetSchema>;

const RecommendationSetResponseBodySchema = RecommendationSetSchema.omit({
  recommendationId: true,
});

export const CareerRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  careerRecommendationId: UuidSchema,
});
export type CareerRecommendationSetResponse = z.infer<
  typeof CareerRecommendationSetResponseSchema
>;

export const StreamRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  streamRecommendationId: UuidSchema,
});
export type StreamRecommendationSetResponse = z.infer<
  typeof StreamRecommendationSetResponseSchema
>;

export const PathwayRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  pathwayRecommendationId: UuidSchema,
});
export type PathwayRecommendationSetResponse = z.infer<
  typeof PathwayRecommendationSetResponseSchema
>;

export const CollegeRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  collegeRecommendationId: UuidSchema,
});
export type CollegeRecommendationSetResponse = z.infer<
  typeof CollegeRecommendationSetResponseSchema
>;

export const AidRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  aidRecommendationId: UuidSchema,
});
export type AidRecommendationSetResponse = z.infer<typeof AidRecommendationSetResponseSchema>;

export const PlanRecommendationSetResponseSchema = RecommendationSetResponseBodySchema.extend({
  planRecommendationId: UuidSchema,
});
export type PlanRecommendationSetResponse = z.infer<
  typeof PlanRecommendationSetResponseSchema
>;

export const RecommendationIdParamsSchema = z.object({
  id: UuidSchema,
});
export type RecommendationIdParams = z.infer<typeof RecommendationIdParamsSchema>;

export const RecommendationReplayResultSchema = z.object({
  recommendationId: UuidSchema,
  replayedAt: IsoTimestampSchema,
  originalOutputHash: z.string().min(1),
  replayOutputHash: z.string().min(1),
  matches: z.boolean(),
  recommendation: RecommendationSetSchema,
});
export type RecommendationReplayResult = z.infer<typeof RecommendationReplayResultSchema>;

const RecommendationBaseRequestSchema = z.object({
  recommendationId: UuidSchema.optional(),
  profileSnapshotId: UuidSchema.optional(),
  profile: ProfileSnapshotForRecommendationsSchema.optional(),
  config: MatchingConfigSchema.optional(),
  createdAt: IsoTimestampSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
}).refine((request) => request.profileSnapshotId || request.profile, {
  message: "Either profileSnapshotId or profile is required.",
  path: ["profileSnapshotId"],
});

export const CareerRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  careers: z.array(CareerCatalogRecordSchema).min(1).optional(),
  feasibilityRules: z
    .array(
      z.object({
        segment: SegmentSchema,
        marksBand: z.string().min(1),
        routeId: UuidSchema,
        reachability: z.union([z.literal(0.3), z.literal(0.65), z.literal(1)]),
        priority: z.number().int(),
      }),
    )
    .optional(),
  counselorPriorities: z
    .array(
      z.object({
        careerId: UuidSchema,
        boost: z.number().min(0).max(1),
      }),
    )
    .optional(),
});

export const StreamRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  streams: z.array(StreamCatalogRecordSchema).min(1).optional(),
});

export const PathwayRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  pathways: z.array(PathwayCatalogRecordSchema).min(1).optional(),
  rankedCareerIds: z.array(UuidSchema).optional(),
  rankedStreamIds: z.array(UuidSchema).optional(),
});

export const CollegeRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  colleges: z.array(CollegeCatalogRecordSchema).min(1).optional(),
  targetDisciplineIds: z.array(UuidSchema).min(1).optional(),
  targetPathwayId: UuidSchema.optional(),
  selectedState: StateSchema.optional(),
  neighboringStates: z.array(StateSchema).optional(),
});

export const AidRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  aidSchemes: z.array(AidSchemeCatalogRecordSchema).min(1).optional(),
  storedFacts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const PlanTargetSchema = z.object({
  entityType: z.enum(["career", "stream", "pathway"]),
  entityId: UuidSchema,
  title: z.string().min(1),
});

export const PlanRecommendationRouteRequestSchema = RecommendationBaseRequestSchema.extend({
  templates: z.array(PlanTemplateCatalogRecordSchema).min(1).optional(),
  target: PlanTargetSchema.optional(),
});

export type CareerRecommendationRouteRequest = z.infer<
  typeof CareerRecommendationRouteRequestSchema
>;
export type StreamRecommendationRouteRequest = z.infer<
  typeof StreamRecommendationRouteRequestSchema
>;
export type PathwayRecommendationRouteRequest = z.infer<
  typeof PathwayRecommendationRouteRequestSchema
>;
export type CollegeRecommendationRouteRequest = z.infer<
  typeof CollegeRecommendationRouteRequestSchema
>;
export type AidRecommendationRouteRequest = z.infer<
  typeof AidRecommendationRouteRequestSchema
>;
export type PlanRecommendationRouteRequest = z.infer<
  typeof PlanRecommendationRouteRequestSchema
>;
