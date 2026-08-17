import type {
  AuditEvent,
  HandoffAction,
  StaffQueueActionRequest,
  StaffQueueActionResponse,
  StaffQueueItem,
} from "@yuvanext/contracts";
import { handoffPriorityByReason } from "./staff-queue.js";

const syntheticActionedUserId = "71111111-1111-4111-8111-111111111111";

function statusForAction(actionType: StaffQueueActionRequest["actionType"]): StaffQueueItem["status"] {
  if (actionType === "actioned") {
    return "actioned";
  }

  if (actionType === "closed") {
    return "closed";
  }

  return "queued";
}

export function createSyntheticQueueAction(
  handoffId: string,
  request: StaffQueueActionRequest,
): StaffQueueActionResponse {
  const action: HandoffAction = {
    actionId: request.idempotencyKey,
    handoffId,
    actorStaffId: request.actorStaffId,
    actionType: request.actionType,
    actionCategory: request.actionCategory,
    noteRecorded: true,
    occurredAt: request.occurredAt,
  };

  const item: StaffQueueItem = {
    handoffId,
    userId: syntheticActionedUserId,
    reason: "tier_1",
    tier: "tier_1",
    priority: handoffPriorityByReason.tier_1,
    status: statusForAction(request.actionType),
    queuedAt: "2026-07-29T10:05:00.000Z",
    alertedAt: "2026-07-29T10:05:10.000Z",
    actionedAt: request.actionType === "actioned" ? request.occurredAt : undefined,
  };

  const auditEvent: AuditEvent = {
    id: request.idempotencyKey,
    actorType: "staff",
    actorId: request.actorStaffId,
    action: "staff.queue.action",
    targetType: "handoff",
    targetId: handoffId,
    requestCorrelationId: request.requestCorrelationId,
    safeMetadata: {
      actionType: request.actionType,
      actionCategory: request.actionCategory,
      noteRecorded: true,
    },
    ipHash: null,
    occurredAt: request.occurredAt,
  };

  return { action, item, auditEvent };
}
