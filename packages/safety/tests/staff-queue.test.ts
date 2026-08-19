import { describe, expect, it } from "vitest";
import { StaffQueueResponseSchema, type StaffQueueItem } from "@yuvanext/contracts";
import {
  handoffPriorityByReason,
  listSyntheticStaffQueue,
  sortStaffQueueItems,
} from "../src/index.js";

const baseQueueItem: StaffQueueItem = {
  handoffId: "11111111-1111-4111-8111-111111111111",
  userId: "21111111-1111-4111-8111-111111111111",
  reason: "tier_2",
  tier: "tier_2",
  priority: handoffPriorityByReason.tier_2,
  status: "queued",
  queuedAt: "2026-07-29T10:02:00.000Z",
};

describe("staff queue", () => {
  it("assigns Tier 1 the highest priority", () => {
    expect(handoffPriorityByReason).toEqual({
      tier_1: 1,
      tier_2: 2,
      tier_3: 3,
      user_request: 4,
      low_confidence: 5,
    });
  });

  it("sorts queue items by priority and then queued time", () => {
    const sortedItems = sortStaffQueueItems([
      baseQueueItem,
      {
        ...baseQueueItem,
        handoffId: "31111111-1111-4111-8111-111111111111",
        reason: "tier_1",
        tier: "tier_1",
        priority: handoffPriorityByReason.tier_1,
        queuedAt: "2026-07-29T10:05:00.000Z",
      },
      {
        ...baseQueueItem,
        handoffId: "41111111-1111-4111-8111-111111111111",
        queuedAt: "2026-07-29T10:01:00.000Z",
      },
    ]);

    expect(sortedItems.map((item) => item.handoffId)).toEqual([
      "31111111-1111-4111-8111-111111111111",
      "41111111-1111-4111-8111-111111111111",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("returns a contract-valid synthetic staff queue", () => {
    const queue = listSyntheticStaffQueue();

    expect(StaffQueueResponseSchema.parse({ items: queue }).items.map((item) => item.priority)).toEqual([
      1, 2, 3,
    ]);
  });
});
