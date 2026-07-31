import { describe, expect, it } from "vitest";
import type { JourneySession } from "@yuvanext/contracts";
import { JourneySessionService } from "./journey-session-service.js";
import type { JourneySessionRepository, NewJourneySession } from "./journey-session-repository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

class InMemoryJourneySessionRepository implements JourneySessionRepository {
  readonly sessions = new Map<string, JourneySession>();

  create(input: NewJourneySession): Promise<JourneySession> {
    const session: JourneySession = { ...input };
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  findByIdForUser(input: {
    sessionId: string;
    userId: string;
  }): Promise<JourneySession | null> {
    const session = this.sessions.get(input.sessionId);
    return Promise.resolve(session?.userId === input.userId ? session : null);
  }

  async markExpired(input: {
    sessionId: string;
    userId: string;
    now: string;
  }): Promise<JourneySession> {
    const session = await this.findByIdForUser(input);
    if (!session) {
      throw new Error("missing test session");
    }
    const expired: JourneySession = { ...session, status: "expired", lastSeenAt: input.now };
    this.sessions.set(input.sessionId, expired);
    return expired;
  }

  async resume(input: {
    sessionId: string;
    userId: string;
    now: string;
    expiresAt: string;
  }): Promise<JourneySession> {
    const session = await this.findByIdForUser(input);
    if (!session) {
      throw new Error("missing test session");
    }
    const resumed: JourneySession = {
      ...session,
      status: "active",
      lastSeenAt: input.now,
      expiresAt: input.expiresAt,
    };
    this.sessions.set(input.sessionId, resumed);
    return resumed;
  }
}

describe("JourneySessionService", () => {
  it("creates an active web journey session for the actor", async () => {
    const repository = new InMemoryJourneySessionRepository();
    const service = new JourneySessionService({
      repository,
      clock: () => new Date("2026-07-28T10:00:00.000Z"),
    });

    const session = await service.create(userId, {});

    expect(session.userId).toBe(userId);
    expect(session.channel).toBe("web");
    expect(session.status).toBe("active");
    expect(session.startedAt).toBe("2026-07-28T10:00:00.000Z");
    expect(session.expiresAt).toBe("2026-08-04T10:00:00.000Z");
  });

  it("retrieves only sessions owned by the actor", async () => {
    const repository = new InMemoryJourneySessionRepository();
    const service = new JourneySessionService({ repository });
    const session = await service.create(userId, {});

    await expect(service.get(session.id, otherUserId)).rejects.toMatchObject({
      code: "journey_session_not_found",
      statusCode: 404,
    });
  });

  it("resumes an active session and extends its expiry", async () => {
    const repository = new InMemoryJourneySessionRepository();
    const service = new JourneySessionService({
      repository,
      clock: () => new Date("2026-07-28T10:00:00.000Z"),
    });
    const session = await service.create(userId, {});

    const resumedService = new JourneySessionService({
      repository,
      clock: () => new Date("2026-07-29T12:00:00.000Z"),
    });
    const resumed = await resumedService.resume(session.id, userId);

    expect(resumed.status).toBe("active");
    expect(resumed.lastSeenAt).toBe("2026-07-29T12:00:00.000Z");
    expect(resumed.expiresAt).toBe("2026-08-05T12:00:00.000Z");
  });

  it("marks an expired session and refuses resume", async () => {
    const repository = new InMemoryJourneySessionRepository();
    const service = new JourneySessionService({
      repository,
      clock: () => new Date("2026-07-28T10:00:00.000Z"),
    });
    const session = await service.create(userId, {});

    const lateService = new JourneySessionService({
      repository,
      clock: () => new Date("2026-08-04T10:00:00.001Z"),
    });

    await expect(lateService.resume(session.id, userId)).rejects.toMatchObject({
      code: "journey_session_expired",
      statusCode: 409,
    });
    expect(repository.sessions.get(session.id)?.status).toBe("expired");
  });
});
