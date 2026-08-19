import { z } from "zod";
import { AuditEventSchema } from "./audit.js";
import { IsoTimestampSchema, SegmentSchema, UuidSchema } from "./common.js";

export const SafetyTierSchema = z.enum(["tier_1", "tier_2", "tier_3"]);
export type SafetyTier = z.infer<typeof SafetyTierSchema>;

export const SafetyTriggerTypeSchema = z.enum(["message", "user_request", "assessment_event"]);
export type SafetyTriggerType = z.infer<typeof SafetyTriggerTypeSchema>;

export const HandoffReasonSchema = z.enum([
  "user_request",
  "tier_1",
  "tier_2",
  "tier_3",
  "low_confidence",
]);
export type HandoffReason = z.infer<typeof HandoffReasonSchema>;

export const HandoffStatusSchema = z.enum(["queued", "alerted", "actioned", "closed", "cancelled"]);
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;

export const SafetyDecisionSchema = z.object({
  decisionId: UuidSchema,
  triggered: z.boolean(),
  tier: SafetyTierSchema.optional(),
  approvedMessageKey: z.string().min(1).max(120).optional(),
  approvedMessageVersion: z.string().min(1).max(80).optional(),
  pauseJourney: z.boolean(),
  createHandoff: z.boolean(),
});
export type SafetyDecision = z.infer<typeof SafetyDecisionSchema>;

export const SafetyCheckContextSchema = z.object({
  userId: UuidSchema,
  sessionId: UuidSchema,
  conversationId: UuidSchema.optional(),
  assessmentRunId: UuidSchema.optional(),
  profileSnapshotId: UuidSchema.optional(),
  segment: SegmentSchema.optional(),
  language: z.string().min(2).max(20).default("en"),
});
export type SafetyCheckContext = z.infer<typeof SafetyCheckContextSchema>;

export const SafetyCheckRequestSchema = z.object({
  sourceEventId: UuidSchema,
  message: z.string().trim().min(1).max(4000),
});
export type SafetyCheckRequest = z.infer<typeof SafetyCheckRequestSchema>;

export const ResolvedSafetyCheckRequestSchema = SafetyCheckRequestSchema.extend({
  triggerType: SafetyTriggerTypeSchema,
  occurredAt: IsoTimestampSchema,
  context: SafetyCheckContextSchema,
});
export type ResolvedSafetyCheckRequest = z.infer<typeof ResolvedSafetyCheckRequestSchema>;

export const SafetyCheckResponseSchema = z.object({
  decision: SafetyDecisionSchema,
});
export type SafetyCheckResponse = z.infer<typeof SafetyCheckResponseSchema>;

export const HandoffPacketSchema = z.object({
  handoffId: UuidSchema,
  user: z.object({
    firstName: z.string().trim().min(1).max(100),
    ageBand: z.string().trim().min(1).max(40),
    segment: SegmentSchema,
  }),
  profile: z.object({
    profileSnapshotId: UuidSchema.optional(),
    code: z.string().trim().min(1).max(40).optional(),
    confidence: z.enum(["normal", "soft"]).optional(),
  }),
  trigger: z.object({
    reason: HandoffReasonSchema,
    excerpt: z.string().trim().min(1).max(500).optional(),
    occurredAt: IsoTimestampSchema,
  }),
  lastTurns: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(10)
    .optional(),
  planState: z.record(z.string(), z.unknown()).optional(),
  consentedContactAvailable: z.boolean(),
  status: z.enum(["queued", "alerted", "actioned"]),
});
export type HandoffPacket = z.infer<typeof HandoffPacketSchema>;

export const CreateHandoffRequestSchema = z.object({
  idempotencyKey: UuidSchema,
  sourceEventId: UuidSchema,
});
export type CreateHandoffRequest = z.infer<typeof CreateHandoffRequestSchema>;

export const ResolvedCreateHandoffRequestSchema = CreateHandoffRequestSchema.extend({
  userId: UuidSchema,
  reason: HandoffReasonSchema,
  user: z.object({
    firstName: z.string().trim().min(1).max(100),
    ageBand: z.string().trim().min(1).max(40),
    segment: SegmentSchema,
  }),
  profile: z.object({
    profileSnapshotId: UuidSchema.optional(),
    code: z.string().trim().min(1).max(40).optional(),
    confidence: z.enum(["normal", "soft"]).optional(),
  }),
  trigger: z.object({
    occurredAt: IsoTimestampSchema,
    excerpt: z.string().trim().min(1).max(500).optional(),
  }),
  lastTurns: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(10)
    .optional(),
  planState: z.record(z.string(), z.unknown()).optional(),
  consentedContactAvailable: z.boolean(),
  requestCorrelationId: UuidSchema,
});
export type ResolvedCreateHandoffRequest = z.infer<typeof ResolvedCreateHandoffRequestSchema>;

export const CreateHandoffResponseSchema = z.object({
  packet: HandoffPacketSchema,
});
export type CreateHandoffResponse = z.infer<typeof CreateHandoffResponseSchema>;

export const StaffQueueItemSchema = z.object({
  handoffId: UuidSchema,
  userId: UuidSchema,
  reason: HandoffReasonSchema,
  tier: SafetyTierSchema.optional(),
  priority: z.number().int().min(1).max(100),
  status: HandoffStatusSchema,
  queuedAt: IsoTimestampSchema,
  alertedAt: IsoTimestampSchema.optional(),
  actionedAt: IsoTimestampSchema.optional(),
});
export type StaffQueueItem = z.infer<typeof StaffQueueItemSchema>;

export const StaffQueueResponseSchema = z.object({
  items: z.array(StaffQueueItemSchema),
});
export type StaffQueueResponse = z.infer<typeof StaffQueueResponseSchema>;

export const StaffQueueActionRequestSchema = z.object({
  idempotencyKey: UuidSchema,
  actionCategory: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(1000),
});
export type StaffQueueActionRequest = z.infer<typeof StaffQueueActionRequestSchema>;

export const ResolvedStaffQueueActionRequestSchema = StaffQueueActionRequestSchema.extend({
  actorStaffId: UuidSchema,
  actionType: z.literal("actioned"),
  occurredAt: IsoTimestampSchema,
  requestCorrelationId: UuidSchema,
});
export type ResolvedStaffQueueActionRequest = z.infer<typeof ResolvedStaffQueueActionRequestSchema>;

export const StaffQueueActionPathParamsSchema = z.object({
  id: UuidSchema,
});
export type StaffQueueActionPathParams = z.infer<typeof StaffQueueActionPathParamsSchema>;

export const HandoffActionSchema = z.object({
  actionId: UuidSchema,
  handoffId: UuidSchema,
  actorStaffId: UuidSchema,
  actionType: z.enum(["claimed", "contact_attempted", "actioned", "closed"]),
  actionCategory: z.string().trim().min(1).max(80),
  noteRecorded: z.boolean(),
  occurredAt: IsoTimestampSchema,
});
export type HandoffAction = z.infer<typeof HandoffActionSchema>;

export const StaffQueueActionResponseSchema = z.object({
  action: HandoffActionSchema,
  item: StaffQueueItemSchema,
  auditEvent: AuditEventSchema,
});
export type StaffQueueActionResponse = z.infer<typeof StaffQueueActionResponseSchema>;

export const StaffPacketPathParamsSchema = z.object({
  userId: UuidSchema,
});
export type StaffPacketPathParams = z.infer<typeof StaffPacketPathParamsSchema>;

export const StaffPacketQuerySchema = z.object({
  includeFlaggedExcerpt: z.enum(["true", "false"]).optional(),
});
export type StaffPacketQuery = z.infer<typeof StaffPacketQuerySchema>;

export const StaffPacketSchema = z.object({
  userId: UuidSchema,
  user: z.object({
    firstName: z.string().trim().min(1).max(100),
    ageBand: z.string().trim().min(1).max(40),
    segment: SegmentSchema,
  }),
  intake: z.object({
    state: z.string().trim().min(1).max(120),
    instruments: z.array(z.string().trim().min(1).max(40)).max(10),
    completionPercent: z.number().int().min(0).max(100),
  }),
  profile: z.object({
    profileSnapshotId: UuidSchema,
    code: z.string().trim().min(1).max(40),
    confidence: z.enum(["normal", "soft"]),
  }),
  recommendations: z.object({
    recommendationSetId: UuidSchema,
    versionHash: z.string().trim().min(8).max(128),
    itemCount: z.number().int().min(0).max(100),
  }),
  flags: z.object({
    hasSafetyEvent: z.boolean(),
    handoffStatus: HandoffStatusSchema,
    highestTier: SafetyTierSchema.optional(),
  }),
  conversationExcerpts: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(500),
        occurredAt: IsoTimestampSchema,
      }),
    )
    .max(5)
    .optional(),
});
export type StaffPacket = z.infer<typeof StaffPacketSchema>;

export const StaffPacketResponseSchema = z.object({
  packet: StaffPacketSchema,
  auditEvent: AuditEventSchema,
});
export type StaffPacketResponse = z.infer<typeof StaffPacketResponseSchema>;

export const StaffSessionQuerySchema = z.object({
  date: z.string().date().optional(),
  segment: SegmentSchema.optional(),
  confidence: z.enum(["normal", "soft"]).optional(),
  handoff: z.enum(["true", "false"]).optional(),
  tier: SafetyTierSchema.optional(),
});
export type StaffSessionQuery = z.infer<typeof StaffSessionQuerySchema>;

export const StaffSessionSchema = z.object({
  sessionId: UuidSchema,
  userId: UuidSchema,
  date: IsoTimestampSchema,
  firstName: z.string().trim().min(1).max(100),
  ageBand: z.string().trim().min(1).max(40),
  segment: SegmentSchema,
  code: z.string().trim().min(1).max(40).optional(),
  instruments: z.array(z.string().trim().min(1).max(40)).max(10),
  completionPercent: z.number().int().min(0).max(100),
  confidence: z.enum(["normal", "soft"]).optional(),
  hasHandoff: z.boolean(),
  highestTier: SafetyTierSchema.optional(),
});
export type StaffSession = z.infer<typeof StaffSessionSchema>;

export const StaffSessionsResponseSchema = z.object({
  sessions: z.array(StaffSessionSchema),
});
export type StaffSessionsResponse = z.infer<typeof StaffSessionsResponseSchema>;

export const PrivacyJobSchema = z.object({
  jobId: UuidSchema,
  userId: UuidSchema,
  jobType: z.enum(["export", "delete"]),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  deadlineAt: IsoTimestampSchema,
  resultAssetRef: z.string().trim().min(1).max(240).optional(),
  resultExpiresAt: IsoTimestampSchema.optional(),
  attemptCount: z.number().int().min(0),
  errorCode: z.string().trim().min(1).max(80).optional(),
  requestedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
});
export type PrivacyJob = z.infer<typeof PrivacyJobSchema>;

export const PrivacyJobRequestSchema = z.object({
  idempotencyKey: UuidSchema,
});
export type PrivacyJobRequest = z.infer<typeof PrivacyJobRequestSchema>;

export const ResolvedPrivacyJobRequestSchema = PrivacyJobRequestSchema.extend({
  userId: UuidSchema,
  requestedBy: UuidSchema,
  authorizationMethod: z.enum(["student_session", "guardian_verified", "staff_assisted"]),
  requestedAt: IsoTimestampSchema,
  requestCorrelationId: UuidSchema,
});
export type ResolvedPrivacyJobRequest = z.infer<typeof ResolvedPrivacyJobRequestSchema>;

export const PrivacyJobPathParamsSchema = z.object({
  id: UuidSchema,
});
export type PrivacyJobPathParams = z.infer<typeof PrivacyJobPathParamsSchema>;

export const PrivacyJobResponseSchema = z.object({
  job: PrivacyJobSchema,
  auditEvent: AuditEventSchema,
});
export type PrivacyJobResponse = z.infer<typeof PrivacyJobResponseSchema>;

export const EvaluationRunSummarySchema = z.object({
  runId: UuidSchema,
  runType: z.enum(["ci", "manual", "scheduled", "release"]),
  status: z.enum(["running", "passed", "failed", "cancelled"]),
  gitRevision: z.string().trim().min(7).max(80),
  environment: z.string().trim().min(1).max(80),
  blockingPassed: z.number().int().min(0),
  blockingFailed: z.number().int().min(0),
  warnings: z.number().int().min(0),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
});
export type EvaluationRunSummary = z.infer<typeof EvaluationRunSummarySchema>;

export const EvaluationRunRequestSchema = z.object({
  idempotencyKey: UuidSchema,
  runType: z.enum(["ci", "manual", "scheduled", "release"]),
});
export type EvaluationRunRequest = z.infer<typeof EvaluationRunRequestSchema>;

export const ResolvedEvaluationRunRequestSchema = EvaluationRunRequestSchema.extend({
  gitRevision: z.string().trim().min(7).max(80),
  environment: z.string().trim().min(1).max(80),
  fixtureVersions: z.record(z.string().min(1).max(80), z.string().min(1).max(120)),
  requestedAt: IsoTimestampSchema,
  requestCorrelationId: UuidSchema,
});
export type ResolvedEvaluationRunRequest = z.infer<typeof ResolvedEvaluationRunRequestSchema>;

export const EvaluationResultSummarySchema = z.object({
  caseId: z.string().trim().min(1).max(120),
  moduleCode: z.enum(["m1", "m2", "m3", "m4", "m5-safety", "m5-evaluation", "integrated"]),
  category: z.enum([
    "scoring",
    "matching",
    "retrieval",
    "grounding",
    "safety",
    "privacy",
    "accessibility",
    "load",
  ]),
  severity: z.enum(["blocking", "warning"]),
  status: z.enum(["passed", "failed", "error", "skipped"]),
  durationMs: z.number().int().min(0),
  failureCodes: z.array(z.string().trim().min(1).max(80)),
});
export type EvaluationResultSummary = z.infer<typeof EvaluationResultSummarySchema>;

export const EvaluationRunResponseSchema = z.object({
  run: EvaluationRunSummarySchema,
  results: z.array(EvaluationResultSummarySchema),
  auditEvent: AuditEventSchema,
});
export type EvaluationRunResponse = z.infer<typeof EvaluationRunResponseSchema>;

export const EvaluationRunPathParamsSchema = z.object({
  id: UuidSchema,
});
export type EvaluationRunPathParams = z.infer<typeof EvaluationRunPathParamsSchema>;
