import type { JourneySession, JourneySessionStatus } from "@yuvanext/contracts";

export type JourneySessionRecord = JourneySession;

export type CreateJourneySessionInput = {
  userId: string;
  anonymousSessionId?: string;
  now: Date;
};

export type ResumeJourneySessionInput = {
  session: JourneySessionRecord;
  now: Date;
};

export const JOURNEY_SESSION_TTL_DAYS = 7;

export const createJourneySessionExpiration = (now: Date): Date => {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + JOURNEY_SESSION_TTL_DAYS);
  return expiresAt;
};

export const isJourneySessionExpired = (session: JourneySessionRecord, now: Date): boolean =>
  new Date(session.expiresAt).getTime() <= now.getTime();

export const canResumeJourneySession = (status: JourneySessionStatus): boolean =>
  status === "active" || status === "paused";
