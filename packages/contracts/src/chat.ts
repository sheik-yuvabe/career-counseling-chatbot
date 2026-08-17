import { z } from "zod";
import { IsoTimestampSchema, SegmentSchema, UuidSchema } from "./common.js";
import { WidgetDirectiveSchema } from "./widgets.js";

export const COUNSELOR_CONTRACT_SCHEMA_VERSION = 1 as const;

export const ConversationStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "safety_locked",
  "deleted",
]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const AiModeSchema = z.enum(["enabled", "degraded", "disabled"]);
export type AiMode = z.infer<typeof AiModeSchema>;

export const ConversationSchema = z
  .object({
    conversationId: UuidSchema,
    profileSnapshotId: UuidSchema.nullable(),
    segment: SegmentSchema,
    status: ConversationStatusSchema,
    channel: z.literal("web"),
    language: z.literal("en"),
    aiMode: AiModeSchema,
    startedAt: IsoTimestampSchema,
    lastTurnAt: IsoTimestampSchema.nullable(),
    completedAt: IsoTimestampSchema.nullable(),
  })
  .strict();
export type Conversation = z.infer<typeof ConversationSchema>;

export const StartConversationRequestSchema = z
  .object({
    profileSnapshotId: UuidSchema.optional(),
    idempotencyKey: UuidSchema,
  })
  .strict();
export type StartConversationRequest = z.infer<typeof StartConversationRequestSchema>;

export const ConversationMessageRoleSchema = z.enum(["user", "assistant", "system_copy"]);
export type ConversationMessageRole = z.infer<typeof ConversationMessageRoleSchema>;

export const ConversationMessageStatusSchema = z.enum([
  "received",
  "generating",
  "completed",
  "blocked",
  "failed",
]);
export type ConversationMessageStatus = z.infer<typeof ConversationMessageStatusSchema>;

export const ConversationMessageSchema = z
  .object({
    messageId: UuidSchema,
    conversationId: UuidSchema,
    turnNumber: z.number().int().positive(),
    role: ConversationMessageRoleSchema,
    content: z.string().trim().min(1),
    contentLanguage: z.literal("en"),
    status: ConversationMessageStatusSchema,
    flags: z.array(z.string().trim().min(1)),
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const SendConversationMessageRequestSchema = z
  .object({
    content: z.string().trim().min(1),
    idempotencyKey: UuidSchema,
  })
  .strict();
export type SendConversationMessageRequest = z.infer<typeof SendConversationMessageRequestSchema>;

export const CounselorToolNameSchema = z.enum([
  "get_profile",
  "match_careers",
  "get_career",
  "get_streams",
  "get_colleges",
  "get_aid_schemes",
  "request_handoff",
]);
export type CounselorToolName = z.infer<typeof CounselorToolNameSchema>;

export const CounselorToolCallStatusSchema = z.enum([
  "requested",
  "running",
  "succeeded",
  "failed",
  "timed_out",
]);
export type CounselorToolCallStatus = z.infer<typeof CounselorToolCallStatusSchema>;

export const CounselorToolCallSchema = z
  .object({
    toolCallId: UuidSchema,
    conversationId: UuidSchema,
    requestMessageId: UuidSchema,
    toolName: CounselorToolNameSchema,
    toolSchemaVersion: z.string().trim().min(1),
    input: z.record(z.string(), z.unknown()),
    inputHash: z.string().trim().min(1),
    outputSnapshot: z.record(z.string(), z.unknown()).nullable(),
    outputHash: z.string().trim().min(1).nullable(),
    sourceVersions: z.record(z.string(), z.string().trim().min(1)),
    status: CounselorToolCallStatusSchema,
    latencyMs: z.number().int().nonnegative().nullable(),
    errorCode: z.string().trim().min(1).nullable(),
    startedAt: IsoTimestampSchema,
    completedAt: IsoTimestampSchema.nullable(),
  })
  .strict();
export type CounselorToolCall = z.infer<typeof CounselorToolCallSchema>;

export const AssistantTurnSchema = z
  .object({
    turnId: UuidSchema,
    conversationId: UuidSchema,
    text: z.string().trim().min(1),
    widgets: z.array(WidgetDirectiveSchema),
    grounding: z
      .object({
        toolCallIds: z.array(UuidSchema),
        entityIds: z.array(UuidSchema),
        recommendationIds: z.array(UuidSchema),
      })
      .strict(),
    flags: z.array(z.string().trim().min(1)),
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type AssistantTurn = z.infer<typeof AssistantTurnSchema>;

export const JourneyStateSchema = z
  .object({
    conversationId: UuidSchema.nullable(),
    currentStep: z.number().int().min(1).max(5),
    currentStateKey: z.string().trim().min(1),
    profileSnapshotId: UuidSchema.nullable(),
    currentRecommendationId: UuidSchema.nullable(),
    currentAssessmentRunId: UuidSchema.nullable(),
    isSafetyPaused: z.boolean(),
    state: z.record(z.string(), z.unknown()).nullable(),
    lockVersion: z.number().int().nonnegative(),
    updatedAt: IsoTimestampSchema,
  })
  .strict();
export type JourneyState = z.infer<typeof JourneyStateSchema>;

export const JourneyEventSchema = z
  .object({
    eventId: UuidSchema,
    conversationId: UuidSchema.nullable(),
    eventType: z.string().trim().min(1),
    eventSchemaVersion: z.number().int().positive(),
    relatedEntityType: z.string().trim().min(1).nullable(),
    relatedEntityId: UuidSchema.nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    occurredAt: IsoTimestampSchema,
  })
  .strict();
export type JourneyEvent = z.infer<typeof JourneyEventSchema>;

export const ExplorationActionSchema = z.enum([
  "viewed",
  "compared",
  "selected",
  "deselected",
  "plan_opened",
]);
export type ExplorationAction = z.infer<typeof ExplorationActionSchema>;

export const ExplorationEventSchema = z
  .object({
    eventId: UuidSchema,
    conversationId: UuidSchema.nullable(),
    recommendationId: UuidSchema,
    recommendationItemId: UuidSchema.nullable(),
    action: ExplorationActionSchema,
    occurredAt: IsoTimestampSchema,
    clientEventId: UuidSchema,
  })
  .strict();
export type ExplorationEvent = z.infer<typeof ExplorationEventSchema>;

export const CreateExplorationEventRequestSchema = ExplorationEventSchema.omit({
  eventId: true,
  occurredAt: true,
}).strict();
export type CreateExplorationEventRequest = z.infer<typeof CreateExplorationEventRequestSchema>;

export const ExplorationEventResponseSchema = z
  .object({
    event: ExplorationEventSchema,
  })
  .strict();
export type ExplorationEventResponse = z.infer<typeof ExplorationEventResponseSchema>;

export const CreateJourneyEventRequestSchema = JourneyEventSchema.omit({
  eventId: true,
  occurredAt: true,
})
  .extend({
    producerEventId: UuidSchema,
    idempotencyKey: UuidSchema,
    expectedLockVersion: z.number().int().nonnegative(),
  })
  .strict();
export type CreateJourneyEventRequest = z.infer<typeof CreateJourneyEventRequestSchema>;

export const CreateJourneyEventResponseSchema = z
  .object({
    event: JourneyEventSchema,
    journey: JourneyStateSchema,
  })
  .strict();
export type CreateJourneyEventResponse = z.infer<typeof CreateJourneyEventResponseSchema>;

export const ReportSnapshotSchema = z
  .object({
    reportId: UuidSchema,
    profileSnapshotId: UuidSchema,
    recommendationIds: z.array(UuidSchema).min(1),
    exploredEntityIds: z.array(UuidSchema),
    reportSchemaVersion: z.number().int().positive(),
    language: z.literal("en"),
    payload: z.record(z.string(), z.unknown()),
    payloadHash: z.string().trim().min(1),
    summaryMode: z.enum(["template", "ai_polished"]),
    promptVersion: z.string().trim().min(1).nullable(),
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type ReportSnapshot = z.infer<typeof ReportSnapshotSchema>;

export const CreateReportRequestSchema = z
  .object({
    profileSnapshotId: UuidSchema,
    recommendationIds: z.array(UuidSchema).min(1),
    explorationEventIds: z.array(UuidSchema),
    language: z.literal("en").default("en"),
    idempotencyKey: UuidSchema,
  })
  .strict();
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

export const StartConversationResponseSchema = z
  .object({
    conversation: ConversationSchema,
    journey: JourneyStateSchema,
    welcomeTurn: AssistantTurnSchema,
  })
  .strict();
export type StartConversationResponse = z.infer<typeof StartConversationResponseSchema>;

export const ConversationHistoryResponseSchema = z
  .object({
    conversation: ConversationSchema,
    messages: z.array(ConversationMessageSchema),
  })
  .strict();
export type ConversationHistoryResponse = z.infer<typeof ConversationHistoryResponseSchema>;

export const JourneyResponseSchema = z
  .object({
    journey: JourneyStateSchema,
  })
  .strict();
export type JourneyResponse = z.infer<typeof JourneyResponseSchema>;

export const ReportResponseSchema = z
  .object({
    report: ReportSnapshotSchema,
  })
  .strict();
export type ReportResponse = z.infer<typeof ReportResponseSchema>;

export const GeneratedAssetSchema = z
  .object({
    assetId: UuidSchema,
    reportId: UuidSchema,
    assetType: z.enum(["report_pdf", "share_card"]),
    contentHash: z.string().trim().min(1),
    storageBucket: z.string().trim().min(1),
    storagePath: z.string().trim().min(1),
    privacyClass: z.enum(["private_report", "share_safe"]),
    generationStatus: z.literal("ready"),
    expiresAt: IsoTimestampSchema,
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type GeneratedAsset = z.infer<typeof GeneratedAssetSchema>;

export const GeneratedAssetResponseSchema = z
  .object({
    asset: GeneratedAssetSchema,
  })
  .strict();
export type GeneratedAssetResponse = z.infer<typeof GeneratedAssetResponseSchema>;

export const CreateShareCardRequestSchema = z
  .object({
    reportId: UuidSchema,
    idempotencyKey: UuidSchema,
  })
  .strict();
export type CreateShareCardRequest = z.infer<typeof CreateShareCardRequestSchema>;

export const RenderReportAssetRequestSchema = z
  .object({
    idempotencyKey: UuidSchema,
  })
  .strict();
export type RenderReportAssetRequest = z.infer<typeof RenderReportAssetRequestSchema>;

export const AssistantTurnSseEventSchema = z.discriminatedUnion("event", [
  z
    .object({
      event: z.literal("assistant_turn"),
      data: AssistantTurnSchema,
    })
    .strict(),
  z
    .object({
      event: z.literal("error"),
      data: z
        .object({
          code: z.string().trim().min(1),
          message: z.string().trim().min(1),
          retryable: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      event: z.literal("done"),
      data: z
        .object({
          conversationId: UuidSchema,
          turnId: UuidSchema,
        })
        .strict(),
    })
    .strict(),
]);
export type AssistantTurnSseEvent = z.infer<typeof AssistantTurnSseEventSchema>;
