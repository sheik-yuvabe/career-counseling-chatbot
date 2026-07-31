import { randomUUID } from "node:crypto";
import type { CreateJourneySessionRequest, JourneySession } from "@yuvanext/contracts";
import {
  canResumeJourneySession,
  createJourneySessionExpiration,
  isJourneySessionExpired,
} from "../domain/journey-session.js";
import {
  journeySessionExpired,
  journeySessionNotFound,
  journeySessionNotResumable,
} from "./errors.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";

export type JourneySessionServiceOptions = {
  repository: JourneySessionRepository;
  clock?: () => Date;
};

export class JourneySessionService {
  private readonly repository: JourneySessionRepository;
  private readonly clock: () => Date;

  constructor(options: JourneySessionServiceOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? (() => new Date());
  }

  async create(userId: string, input: CreateJourneySessionRequest): Promise<JourneySession> {
    const now = this.clock();
    return this.repository.create({
      id: randomUUID(),
      userId,
      anonymousSessionId: input.anonymousSessionId ?? null,
      channel: "web",
      status: "active",
      startedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: createJourneySessionExpiration(now).toISOString(),
      completedAt: null,
    });
  }

  async get(sessionId: string, userId: string): Promise<JourneySession> {
    const session = await this.repository.findByIdForUser({ sessionId, userId });
    if (!session) {
      throw journeySessionNotFound();
    }
    return session;
  }

  async resume(sessionId: string, userId: string): Promise<JourneySession> {
    const session = await this.get(sessionId, userId);
    const now = this.clock();

    if (isJourneySessionExpired(session, now)) {
      await this.repository.markExpired({ sessionId, userId, now: now.toISOString() });
      throw journeySessionExpired();
    }

    if (!canResumeJourneySession(session.status)) {
      throw journeySessionNotResumable();
    }

    return this.repository.resume({
      sessionId,
      userId,
      now: now.toISOString(),
      expiresAt: createJourneySessionExpiration(now).toISOString(),
    });
  }
}
