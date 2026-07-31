import { describe, expect, it } from "vitest";
import type { JourneySession, UserProfile } from "@yuvanext/contracts";
import { UserProfileService } from "./user-profile-service.js";
import type { JourneySessionRepository, NewJourneySession } from "./journey-session-repository.js";
import type { UpsertUserProfileRecord, UserProfileRepository } from "./user-profile-repository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

class InMemoryJourneySessionRepository implements JourneySessionRepository {
  readonly sessions = new Map<string, JourneySession>();

  create(input: NewJourneySession): Promise<JourneySession> {
    const session: JourneySession = { ...input };
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  findByIdForUser(input: { sessionId: string; userId: string }): Promise<JourneySession | null> {
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

class InMemoryUserProfileRepository implements UserProfileRepository {
  readonly profiles = new Map<string, UserProfile>();

  upsert(input: UpsertUserProfileRecord): Promise<UserProfile> {
    const existing = this.profiles.get(input.userId);
    const profile: UserProfile = {
      userId: input.userId,
      firstName: input.firstName,
      ageAtOnboarding: input.ageAtOnboarding,
      ageBand: input.ageBand as UserProfile["ageBand"],
      city: input.city,
      state: input.state,
      countryCode: input.countryCode,
      segment: input.segment as UserProfile["segment"],
      selfStage: input.selfStage as UserProfile["selfStage"],
      wantsAid: input.wantsAid,
      profileStatus: input.profileStatus,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      deletedAt: null,
    };
    this.profiles.set(input.userId, profile);
    return Promise.resolve(profile);
  }

  findByUserId(profileUserId: string): Promise<UserProfile | null> {
    return Promise.resolve(this.profiles.get(profileUserId) ?? null);
  }
}

const createSession = (overrides: Partial<JourneySession> = {}): JourneySession => ({
  id: sessionId,
  userId,
  anonymousSessionId: null,
  channel: "web",
  status: "active",
  startedAt: "2026-07-28T10:00:00.000Z",
  lastSeenAt: "2026-07-28T10:00:00.000Z",
  expiresAt: "2026-08-04T10:00:00.000Z",
  completedAt: null,
  ...overrides,
});

const createService = (
  session: JourneySession = createSession(),
): {
  service: UserProfileService;
  profileRepository: InMemoryUserProfileRepository;
} => {
  const journeySessionRepository = new InMemoryJourneySessionRepository();
  journeySessionRepository.sessions.set(session.id, session);
  const profileRepository = new InMemoryUserProfileRepository();
  return {
    service: new UserProfileService({
      journeySessionRepository,
      userProfileRepository: profileRepository,
      clock: () => new Date("2026-07-28T10:00:00.000Z"),
    }),
    profileRepository,
  };
};

describe("UserProfileService", () => {
  it("calculates age from date of birth and stores an Explorer profile", async () => {
    const { service } = createService();

    const profile = await service.upsertForSession({
      sessionId,
      userId,
      profile: {
        firstName: "Anandi",
        dateOfBirth: "2012-08-10",
        city: "Auroville",
        state: "Tamil Nadu",
        countryCode: "in",
        selfStage: "school",
        wantsAid: false,
      },
    });

    expect(profile.ageAtOnboarding).toBe(13);
    expect(profile.ageBand).toBe("minor_12_13");
    expect(profile.countryCode).toBe("IN");
    expect(profile.segment).toBe("explorer");
  });

  it("does not persist under-12 profiles", async () => {
    const { service, profileRepository } = createService();

    await expect(
      service.upsertForSession({
        sessionId,
        userId,
        profile: {
          firstName: "Tiny",
          dateOfBirth: "2015-07-29",
          city: "Pune",
          state: "Maharashtra",
          countryCode: "IN",
          selfStage: "school",
          wantsAid: false,
        },
      }),
    ).rejects.toMatchObject({ code: "under_12_ineligible", statusCode: 422 });
    expect(profileRepository.profiles.size).toBe(0);
  });

  it("lets self-described stage override the age-based segment", async () => {
    const { service } = createService();

    const profile = await service.upsertForSession({
      sessionId,
      userId,
      profile: {
        firstName: "Mira",
        ageAtOnboarding: 15,
        city: "Kochi",
        state: "Kerala",
        countryCode: "IN",
        selfStage: "higher_secondary",
        wantsAid: true,
      },
    });

    expect(profile.ageBand).toBe("minor_14_15");
    expect(profile.segment).toBe("pathfinder");
    expect(profile.wantsAid).toBe(true);
  });

  it("requires the journey session to belong to the actor", async () => {
    const { service } = createService(
      createSession({ userId: "33333333-3333-4333-8333-333333333333" }),
    );

    await expect(
      service.upsertForSession({
        sessionId,
        userId,
        profile: {
          firstName: "Anandi",
          ageAtOnboarding: 14,
          city: "Auroville",
          state: "Tamil Nadu",
          countryCode: "IN",
          selfStage: "school",
          wantsAid: false,
        },
      }),
    ).rejects.toMatchObject({ code: "journey_session_not_found", statusCode: 404 });
  });
});
