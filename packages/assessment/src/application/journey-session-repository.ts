import type { JourneySession } from "@yuvanext/contracts";

export type NewJourneySession = {
  id: string;
  userId: string;
  anonymousSessionId: string | null;
  channel: "web";
  status: "active";
  startedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  completedAt: null;
};

export type JourneySessionRepository = {
  create(input: NewJourneySession): Promise<JourneySession>;
  findByIdForUser(input: { sessionId: string; userId: string }): Promise<JourneySession | null>;
  markExpired(input: { sessionId: string; userId: string; now: string }): Promise<JourneySession>;
  resume(input: { sessionId: string; userId: string; now: string; expiresAt: string }): Promise<JourneySession>;
};
