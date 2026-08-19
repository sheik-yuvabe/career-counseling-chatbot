import { describe, expect, it } from "vitest";
import {
  AuditEventSchema,
  CreateHandoffRequestSchema,
  HandoffPacketSchema,
  PrivacyJobResponseSchema,
  SafeAuditMetadataSchema,
  SafetyCheckRequestSchema,
  SafetyDecisionSchema,
  StaffPacketResponseSchema,
  StaffQueueActionRequestSchema,
  StaffQueueActionResponseSchema,
  StaffQueueResponseSchema,
} from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-28T10:00:00.000Z";

describe("module 5 shared contracts", () => {
  it("accepts a safety pre-check request from Module 4", () => {
    const result = SafetyCheckRequestSchema.safeParse({
      sourceEventId: uuid,
      triggerType: "message",
      message: "Which career should I explore after 12th?",
      occurredAt: timestamp,
      context: {
        userId: uuid,
        sessionId: uuid,
        segment: "explorer",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported safety tiers", () => {
    const result = SafetyDecisionSchema.safeParse({
      decisionId: uuid,
      triggered: true,
      tier: "urgent",
      approvedMessageKey: "mock_safety.tier_1",
      approvedMessageVersion: "mock-safety-md-v1",
      pauseJourney: true,
      createHandoff: true,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a restricted handoff packet without requiring conversation excerpts", () => {
    const result = HandoffPacketSchema.safeParse({
      handoffId: uuid,
      user: {
        firstName: "Asha",
        ageBand: "16-18",
        segment: "pathfinder",
      },
      profile: {
        profileSnapshotId: uuid,
        code: "RIA",
        confidence: "normal",
      },
      trigger: {
        reason: "tier_2",
        occurredAt: timestamp,
      },
      consentedContactAvailable: true,
      status: "queued",
    });

    expect(result.success).toBe(true);
  });

  it("rejects prohibited audit metadata keys", () => {
    const result = SafeAuditMetadataSchema.safeParse({
      tier: "tier_1",
      phone: "9999999999",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an audit event with safe metadata only", () => {
    const result = AuditEventSchema.safeParse({
      id: uuid,
      actorType: "staff",
      actorId: uuid,
      action: "staff.packet.view",
      targetType: "handoff",
      targetId: uuid,
      requestCorrelationId: uuid,
      safeMetadata: {
        tier: "tier_1",
        role: "counselor",
      },
      ipHash: null,
      occurredAt: timestamp,
    });

    expect(result.success).toBe(true);
  });

  it("requires idempotency for staff queue writes", () => {
    const result = StaffQueueActionRequestSchema.safeParse({
      actorStaffId: uuid,
      actionType: "actioned",
      actionCategory: "guardian_contacted",
      note: "Synthetic action note",
      occurredAt: timestamp,
      requestCorrelationId: uuid,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a staff queue action response with safe audit metadata", () => {
    const result = StaffQueueActionResponseSchema.safeParse({
      action: {
        actionId: uuid,
        handoffId: uuid,
        actorStaffId: uuid,
        actionType: "actioned",
        actionCategory: "guardian_contacted",
        noteRecorded: true,
        occurredAt: timestamp,
      },
      item: {
        handoffId: uuid,
        userId: uuid,
        reason: "tier_1",
        tier: "tier_1",
        priority: 1,
        status: "actioned",
        queuedAt: timestamp,
        alertedAt: timestamp,
        actionedAt: timestamp,
      },
      auditEvent: {
        id: uuid,
        actorType: "staff",
        actorId: uuid,
        action: "staff.queue.action",
        targetType: "handoff",
        targetId: uuid,
        requestCorrelationId: uuid,
        safeMetadata: {
          actionType: "actioned",
          actionCategory: "guardian_contacted",
          noteRecorded: true,
        },
        ipHash: null,
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a staff packet response without excerpts by default", () => {
    const result = StaffPacketResponseSchema.safeParse({
      packet: {
        userId: uuid,
        user: {
          firstName: "Asha",
          ageBand: "16-18",
          segment: "explorer",
        },
        intake: {
          state: "Tamil Nadu",
          instruments: ["mini_ip"],
          completionPercent: 100,
        },
        profile: {
          profileSnapshotId: uuid,
          code: "RIA",
          confidence: "normal",
        },
        recommendations: {
          recommendationSetId: uuid,
          versionHash: "synthetic-rec-hash-v1",
          itemCount: 3,
        },
        flags: {
          hasSafetyEvent: true,
          handoffStatus: "alerted",
          highestTier: "tier_1",
        },
      },
      auditEvent: {
        id: uuid,
        actorType: "staff",
        actorId: null,
        action: "staff.packet.view",
        targetType: "user_profile",
        targetId: uuid,
        requestCorrelationId: uuid,
        safeMetadata: {
          includeFlaggedExcerpt: false,
          hasSafetyEvent: true,
          highestTier: "tier_1",
        },
        ipHash: null,
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a privacy job response with safe audit metadata", () => {
    const result = PrivacyJobResponseSchema.safeParse({
      job: {
        jobId: uuid,
        userId: uuid,
        jobType: "export",
        status: "queued",
        deadlineAt: timestamp,
        attemptCount: 0,
        requestedAt: timestamp,
      },
      auditEvent: {
        id: uuid,
        actorType: "user",
        actorId: uuid,
        action: "privacy.export.request",
        targetType: "privacy_job",
        targetId: uuid,
        requestCorrelationId: uuid,
        safeMetadata: {
          jobType: "export",
          authorizationMethod: "student_session",
          status: "queued",
        },
        ipHash: null,
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(true);
  });

  it("requires idempotency for handoff creation", () => {
    const result = CreateHandoffRequestSchema.safeParse({
      userId: uuid,
      reason: "tier_1",
      user: {
        firstName: "Asha",
        ageBand: "16-18",
        segment: "explorer",
      },
      profile: {},
      trigger: {
        occurredAt: timestamp,
      },
      consentedContactAvailable: true,
      requestCorrelationId: uuid,
    });

    expect(result.success).toBe(false);
  });

  it("requires a real user id for handoff creation", () => {
    const result = CreateHandoffRequestSchema.safeParse({
      idempotencyKey: uuid,
      reason: "tier_1",
      user: {
        firstName: "Asha",
        ageBand: "16-18",
        segment: "explorer",
      },
      profile: {
        profileSnapshotId: uuid,
      },
      trigger: {
        occurredAt: timestamp,
      },
      consentedContactAvailable: true,
      requestCorrelationId: uuid,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a privacy-light staff queue response", () => {
    const result = StaffQueueResponseSchema.safeParse({
      items: [
        {
          handoffId: uuid,
          userId: uuid,
          reason: "tier_1",
          tier: "tier_1",
          priority: 1,
          status: "alerted",
          queuedAt: timestamp,
          alertedAt: timestamp,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
