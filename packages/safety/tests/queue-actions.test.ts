import { describe, expect, it } from "vitest";
import { StaffQueueActionResponseSchema, type StaffQueueActionRequest } from "@yuvanext/contracts";
import { createSyntheticQueueAction } from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const staffId = "21111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-29T11:00:00.000Z";

const request: StaffQueueActionRequest = {
  idempotencyKey: uuid,
  actorStaffId: staffId,
  actionType: "actioned",
  actionCategory: "guardian_contacted",
  note: "Synthetic counselor note for POC action.",
  occurredAt: timestamp,
  requestCorrelationId: uuid,
};

describe("queue actions", () => {
  it("creates an actioned queue item and safe audit event", () => {
    const response = createSyntheticQueueAction(uuid, request);

    expect(StaffQueueActionResponseSchema.parse(response)).toEqual({
      action: {
        actionId: uuid,
        handoffId: uuid,
        actorStaffId: staffId,
        actionType: "actioned",
        actionCategory: "guardian_contacted",
        noteRecorded: true,
        occurredAt: timestamp,
      },
      item: {
        handoffId: uuid,
        userId: "71111111-1111-4111-8111-111111111111",
        reason: "tier_1",
        tier: "tier_1",
        priority: 1,
        status: "actioned",
        queuedAt: "2026-07-29T10:05:00.000Z",
        alertedAt: "2026-07-29T10:05:10.000Z",
        actionedAt: timestamp,
      },
      auditEvent: {
        id: uuid,
        actorType: "staff",
        actorId: staffId,
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
  });

  it("does not copy the raw note into audit metadata", () => {
    const response = createSyntheticQueueAction(uuid, request);

    expect(Object.keys(response.auditEvent.safeMetadata)).not.toContain("note");
  });
});
