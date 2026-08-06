import { z } from "zod";
import { IsoTimestampSchema, SegmentSchema, UuidSchema } from "./common.js";
import { AgeBandSchema, EducationStageSchema } from "./profile.js";

export const InstrumentCodeSchema = z.enum([
  "ip_60",
  "mini_ip_30",
  "photo_ip",
  "wip",
  "mini_ipip",
  "aptitude",
]);
export type InstrumentCode = z.infer<typeof InstrumentCodeSchema>;

export const AssessmentRunStatusSchema = z.enum([
  "created",
  "active",
  "paused",
  "completed",
  "scored",
  "abandoned",
]);
export type AssessmentRunStatus = z.infer<typeof AssessmentRunStatusSchema>;

export const AssessmentItemTypeSchema = z.enum([
  "likert",
  "photo_pair",
  "forced_choice",
  "mcq",
  "qc",
]);
export type AssessmentItemType = z.infer<typeof AssessmentItemTypeSchema>;

export const RiasecScaleSchema = z.enum(["R", "I", "A", "S", "E", "C"]);
export type RiasecScale = z.infer<typeof RiasecScaleSchema>;

export const ConfidenceSchema = z.enum(["normal", "soft"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const AssessmentOptionSchema = z.object({
  id: UuidSchema,
  optionKey: z.string().min(1),
  displayOrder: z.number().int().positive(),
  labelText: z.string().nullable(),
  assetRef: z.string().nullable(),
});
export type AssessmentOption = z.infer<typeof AssessmentOptionSchema>;

export const AssessmentItemSchema = z.object({
  id: UuidSchema,
  itemKey: z.string().min(1),
  displayOrder: z.number().int().positive(),
  itemType: AssessmentItemTypeSchema,
  promptText: z.string().nullable(),
  promptAssetRef: z.string().nullable(),
  scaleCode: z.string().nullable(),
  isQc: z.boolean(),
  options: z.array(AssessmentOptionSchema),
});
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>;

export const AssessmentRunSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  journeySessionId: UuidSchema,
  assessmentVersionId: UuidSchema,
  instrumentCode: InstrumentCodeSchema,
  instrumentVersion: z.string().min(1),
  algorithmVersion: z.string().min(1),
  segment: SegmentSchema,
  status: AssessmentRunStatusSchema,
  currentPosition: z.number().int().min(0),
  startedAt: IsoTimestampSchema,
  lastAnsweredAt: IsoTimestampSchema.nullable(),
  completedAt: IsoTimestampSchema.nullable(),
  scoredAt: IsoTimestampSchema.nullable(),
  resumeExpiresAt: IsoTimestampSchema,
  attemptNumber: z.number().int().positive(),
  createdAt: IsoTimestampSchema,
});
export type AssessmentRun = z.infer<typeof AssessmentRunSchema>;

export const StartAssessmentRunRequestSchema = z.object({
  language: z.string().min(2).max(16).default("en"),
  mode: z.enum(["text", "photo"]).optional(),
});
export type StartAssessmentRunRequest = z.infer<typeof StartAssessmentRunRequestSchema>;

export const AssessmentRunResponseSchema = z.object({ run: AssessmentRunSchema });
export type AssessmentRunResponse = z.infer<typeof AssessmentRunResponseSchema>;

export const AssessmentNextResponseSchema = z.object({
  run: AssessmentRunSchema,
  progress: z.object({
    answered: z.number().int().min(0),
    total: z.number().int().min(0),
    nextPosition: z.number().int().min(0),
    isComplete: z.boolean(),
  }),
  items: z.array(AssessmentItemSchema),
});
export type AssessmentNextResponse = z.infer<typeof AssessmentNextResponseSchema>;

export const SubmitAssessmentResponseRequestSchema = z.object({
  itemId: UuidSchema,
  selectedOptionId: UuidSchema.optional(),
  responseValue: z.number().int().min(1).max(5).optional(),
  responseJson: z.unknown().optional(),
  latencyMs: z.number().int().min(0).max(3_600_000).optional(),
  answeredAt: IsoTimestampSchema.optional(),
});
export type SubmitAssessmentResponseRequest = z.infer<
  typeof SubmitAssessmentResponseRequestSchema
>;

export const AssessmentResponseSchema = z.object({
  id: UuidSchema,
  assessmentRunId: UuidSchema,
  itemId: UuidSchema,
  selectedOptionId: UuidSchema.nullable(),
  responseValue: z.number().int().nullable(),
  responseJson: z.unknown().nullable(),
  latencyMs: z.number().int().nullable(),
  answeredAt: IsoTimestampSchema,
  receivedAt: IsoTimestampSchema,
});
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;

export const AssessmentResponseSaveResponseSchema = z.object({
  response: AssessmentResponseSchema,
  next: AssessmentNextResponseSchema,
});
export type AssessmentResponseSaveResponse = z.infer<
  typeof AssessmentResponseSaveResponseSchema
>;

export const RiasecScoresSchema = z.record(RiasecScaleSchema, z.number());

export const AssessmentResultSchema = z.object({
  id: UuidSchema,
  assessmentRunId: UuidSchema,
  userId: UuidSchema,
  instrumentCode: InstrumentCodeSchema,
  instrumentVersion: z.string().min(1),
  algorithmVersion: z.string().min(1),
  rawScores: RiasecScoresSchema,
  normalizedScores: RiasecScoresSchema,
  resultCode: z.string().min(1),
  confidence: ConfidenceSchema,
  closeScores: z.boolean(),
  qcSummary: z.record(z.string(), z.unknown()),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1),
  createdAt: IsoTimestampSchema,
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

export const AssessmentResultResponseSchema = z.object({ result: AssessmentResultSchema });
export type AssessmentResultResponse = z.infer<typeof AssessmentResultResponseSchema>;

export const ProfileSnapshotSchema = z.object({
  snapshotId: UuidSchema,
  userId: UuidSchema,
  segment: SegmentSchema,
  ageBand: AgeBandSchema,
  city: z.string().min(1),
  state: z.string().min(1),
  selfStage: EducationStageSchema,
  wantsAid: z.boolean(),
  intakeSummary: z.record(z.string(), z.unknown()),
  riasec: z
    .object({
      rawScores: RiasecScoresSchema,
      normalizedScores: RiasecScoresSchema,
      code: z.string().min(1),
      confidence: ConfidenceSchema,
      closeScores: z.boolean(),
      instrumentCode: InstrumentCodeSchema,
      instrumentVersion: z.string().min(1),
    })
    .optional(),
  profileVersion: z.number().int().positive(),
  algorithmVersion: z.string().min(1),
  sourceResultIds: z.array(UuidSchema),
  createdAt: IsoTimestampSchema,
});
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;

export const ProfileSnapshotResponseSchema = z.object({ snapshot: ProfileSnapshotSchema });
export type ProfileSnapshotResponse = z.infer<typeof ProfileSnapshotResponseSchema>;
