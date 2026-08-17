import type { HandoffReason, StaffQueueItem } from "@yuvanext/contracts";

export const handoffPriorityByReason = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
  user_request: 4,
  low_confidence: 5,
} as const satisfies Record<HandoffReason, number>;

const syntheticQueueItems = [
  {
    handoffId: "11111111-1111-4111-8111-111111111111",
    userId: "21111111-1111-4111-8111-111111111111",
    reason: "tier_2",
    tier: "tier_2",
    priority: handoffPriorityByReason.tier_2,
    status: "queued",
    queuedAt: "2026-07-29T10:02:00.000Z",
  },
  {
    handoffId: "31111111-1111-4111-8111-111111111111",
    userId: "41111111-1111-4111-8111-111111111111",
    reason: "tier_1",
    tier: "tier_1",
    priority: handoffPriorityByReason.tier_1,
    status: "alerted",
    queuedAt: "2026-07-29T10:05:00.000Z",
    alertedAt: "2026-07-29T10:05:10.000Z",
  },
  {
    handoffId: "51111111-1111-4111-8111-111111111111",
    userId: "61111111-1111-4111-8111-111111111111",
    reason: "tier_3",
    tier: "tier_3",
    priority: handoffPriorityByReason.tier_3,
    status: "queued",
    queuedAt: "2026-07-29T10:01:00.000Z",
  },
] as const satisfies readonly StaffQueueItem[];

export function sortStaffQueueItems(items: readonly StaffQueueItem[]): StaffQueueItem[] {
  return [...items].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.queuedAt.localeCompare(right.queuedAt);
  });
}

export function listSyntheticStaffQueue(): StaffQueueItem[] {
  return sortStaffQueueItems(syntheticQueueItems);
}
