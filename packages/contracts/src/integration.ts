import { z } from "zod";
import { IsoTimestampSchema, SegmentSchema, StateSchema, UuidSchema } from "./common.js";

const RiasecScoresSchema = z
  .object({
    R: z.number(),
    I: z.number(),
    A: z.number(),
    S: z.number(),
    E: z.number(),
    C: z.number(),
  })
  .strict();

export const ProfileSnapshotSchema = z
  .object({
    snapshotId: UuidSchema,
    userId: UuidSchema,
    segment: SegmentSchema,
    ageBand: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: StateSchema,
    selfStage: z.string().trim().min(1),
    wantsAid: z.boolean(),
    intakeSummary: z.record(z.string(), z.unknown()),
    riasec: z
      .object({
        rawScores: RiasecScoresSchema,
        normalizedScores: RiasecScoresSchema,
        code: z.string().trim().min(1),
        confidence: z.enum(["normal", "soft"]),
        closeScores: z.boolean(),
        instrumentCode: z.string().trim().min(1),
        instrumentVersion: z.string().trim().min(1),
      })
      .strict()
      .optional(),
    values: z.record(z.string(), z.unknown()).optional(),
    bigFive: z.record(z.string(), z.unknown()).optional(),
    aptitude: z.record(z.string(), z.unknown()).optional(),
    profileVersion: z.number().int().positive(),
    algorithmVersion: z.string().trim().min(1),
    sourceResultIds: z.array(UuidSchema),
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;

export const ProfileSnapshotResponseSchema = z
  .object({
    profile: ProfileSnapshotSchema,
  })
  .strict();
export type ProfileSnapshotResponse = z.infer<typeof ProfileSnapshotResponseSchema>;

export const RecommendationKindSchema = z.enum([
  "career",
  "stream",
  "pathway",
  "college",
  "aid",
  "plan",
]);
export type RecommendationKind = z.infer<typeof RecommendationKindSchema>;

export const RecommendationItemSchema = z
  .object({
    itemId: UuidSchema,
    entityType: z.string().trim().min(1),
    entityId: UuidSchema,
    rank: z.number().int().positive(),
    fitScore: z.number().optional(),
    ring: z.enum(["inner", "middle", "outer"]).optional(),
    explanation: z.record(z.string(), z.unknown()),
  })
  .strict();
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const RecommendationSetSchema = z
  .object({
    recommendationId: UuidSchema,
    profileSnapshotId: UuidSchema,
    kind: RecommendationKindSchema,
    items: z.array(RecommendationItemSchema),
    algorithmVersion: z.string().trim().min(1),
    weightsVersion: z.string().trim().min(1),
    sourceDataVersions: z.record(z.string(), z.string().trim().min(1)),
    inputHash: z.string().trim().min(1),
    outputHash: z.string().trim().min(1),
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type RecommendationSet = z.infer<typeof RecommendationSetSchema>;

export const RecommendationSetResponseSchema = z
  .object({
    recommendation: RecommendationSetSchema,
  })
  .strict();
export type RecommendationSetResponse = z.infer<typeof RecommendationSetResponseSchema>;

export const CatalogEntityTypeSchema = z.enum([
  "career",
  "pathway",
  "stream",
  "college",
  "program",
  "aid",
]);
export type CatalogEntityType = z.infer<typeof CatalogEntityTypeSchema>;

export const CatalogEntitySchema = z
  .object({
    id: UuidSchema,
    entityType: CatalogEntityTypeSchema,
    title: z.string().trim().min(1),
    status: z.enum(["published", "retired"]),
    datasetVersion: z.string().trim().min(1),
    sourceRefs: z.array(z.string().trim().min(1)),
    lastVerifiedAt: IsoTimestampSchema.optional(),
  })
  .strict();
export type CatalogEntity = z.infer<typeof CatalogEntitySchema>;

export const RetrievedEvidenceSchema = z
  .object({
    queryType: z.string().trim().min(1),
    entities: z.array(CatalogEntitySchema),
    sourceVersions: z.record(z.string(), z.string().trim().min(1)),
    retrievedAt: IsoTimestampSchema,
  })
  .strict();
export type RetrievedEvidence = z.infer<typeof RetrievedEvidenceSchema>;
