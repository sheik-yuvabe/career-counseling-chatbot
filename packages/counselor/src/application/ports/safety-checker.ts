import type { HandoffPacket, HandoffReason, SafetyDecision } from "@yuvanext/contracts";

export type SafetyPreCheckInput = {
  userId: string;
  sessionId: string;
  conversationId: string;
  sourceEventId: string;
  content: string;
  occurredAt: string;
  profileSnapshotId: string;
  segment: "explorer" | "pathfinder" | "launcher";
  language: "en";
};

export type RequestHandoffInput = {
  idempotencyKey: string;
  sourceEventId: string;
  userId: string;
  reason: HandoffReason;
  user: HandoffPacket["user"];
  profile: HandoffPacket["profile"];
  trigger: Omit<HandoffPacket["trigger"], "reason">;
  lastTurns: NonNullable<HandoffPacket["lastTurns"]>;
  planState: Record<string, unknown>;
  consentedContactAvailable: boolean;
  requestCorrelationId: string;
};

export interface SafetyChecker {
  preCheck(input: SafetyPreCheckInput): Promise<SafetyDecision>;
  requestHandoff(input: RequestHandoffInput): Promise<HandoffPacket>;
}
