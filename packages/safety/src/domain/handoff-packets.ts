import type { HandoffPacket, ResolvedCreateHandoffRequest } from "@yuvanext/contracts";

export function createSyntheticHandoffPacket(request: ResolvedCreateHandoffRequest): HandoffPacket {
  return {
    handoffId: request.idempotencyKey,
    user: request.user,
    profile: request.profile,
    trigger: {
      reason: request.reason,
      excerpt: request.trigger.excerpt,
      occurredAt: request.trigger.occurredAt,
    },
    lastTurns: request.lastTurns,
    planState: request.planState,
    consentedContactAvailable: request.consentedContactAvailable,
    status: request.reason === "tier_1" ? "alerted" : "queued",
  };
}
