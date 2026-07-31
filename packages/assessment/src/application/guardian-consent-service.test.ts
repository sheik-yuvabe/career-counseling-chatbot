import { describe, expect, it } from "vitest";
import type { GuardianConsent, JourneySession, UserProfile } from "@yuvanext/contracts";
import { GuardianConsentService } from "./guardian-consent-service.js";
import type {
  GuardianConsentRepository,
  NewGuardianConsent,
} from "./guardian-consent-repository.js";
import { InMemoryGuardianOtpStore } from "./guardian-otp-store.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";
import type { UserProfileRepository } from "./user-profile-repository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

class InMemoryJourneySessionRepository implements JourneySessionRepository {
  constructor(private readonly session: JourneySession) {}

  create(): Promise<JourneySession> {
    throw new Error("not used");
  }

  findByIdForUser(input: {
    sessionId: string;
    userId: string;
  }): Promise<JourneySession | null> {
    return Promise.resolve(
      this.session.id === input.sessionId && this.session.userId === input.userId ? this.session : null,
    );
  }

  markExpired(input: { now: string }): Promise<JourneySession> {
    return Promise.resolve({ ...this.session, status: "expired", lastSeenAt: input.now });
  }

  resume(): Promise<JourneySession> {
    throw new Error("not used");
  }
}

class InMemoryUserProfileRepository implements UserProfileRepository {
  constructor(private readonly profile: UserProfile | null) {}

  upsert(): Promise<UserProfile> {
    throw new Error("not used");
  }

  findByUserId(profileUserId: string): Promise<UserProfile | null> {
    return Promise.resolve(this.profile?.userId === profileUserId ? this.profile : null);
  }
}

class InMemoryGuardianConsentRepository implements GuardianConsentRepository {
  readonly consents = new Map<string, GuardianConsent>();

  createPending(input: NewGuardianConsent): Promise<GuardianConsent> {
    const consent: GuardianConsent = {
      id: input.id,
      userId: input.userId,
      consentType: "guardian",
      guardianPhoneLast4: input.guardianPhoneLast4,
      status: "pending",
      textVersion: input.textVersion,
      requestedAt: input.now,
      verifiedAt: null,
      declinedAt: null,
      expiredAt: null,
      revokedAt: null,
      createdAt: input.now,
    };
    this.consents.set(consent.id, consent);
    return Promise.resolve(consent);
  }

  findByIdForUser(input: {
    consentId: string;
    userId: string;
  }): Promise<GuardianConsent | null> {
    const consent = this.consents.get(input.consentId);
    return Promise.resolve(consent?.userId === input.userId ? consent : null);
  }

  findLatestForUser(consentUserId: string): Promise<GuardianConsent | null> {
    return Promise.resolve(
      [...this.consents.values()].find((consent) => consent.userId === consentUserId) ?? null,
    );
  }

  hasGrantedForUser(consentUserId: string): Promise<boolean> {
    return Promise.resolve(
      [...this.consents.values()].some(
        (consent) => consent.userId === consentUserId && consent.status === "granted",
      ),
    );
  }

  async grant(input: {
    consentId: string;
    userId: string;
    now: string;
  }): Promise<GuardianConsent> {
    const consent = await this.findByIdForUser(input);
    if (!consent) {
      throw new Error("missing consent");
    }
    const granted: GuardianConsent = { ...consent, status: "granted", verifiedAt: input.now };
    this.consents.set(input.consentId, granted);
    return granted;
  }

  async expire(input: {
    consentId: string;
    userId: string;
    now: string;
  }): Promise<GuardianConsent> {
    const consent = await this.findByIdForUser(input);
    if (!consent) {
      throw new Error("missing consent");
    }
    const expired: GuardianConsent = { ...consent, status: "expired", expiredAt: input.now };
    this.consents.set(input.consentId, expired);
    return expired;
  }
}

const session: JourneySession = {
  id: sessionId,
  userId,
  anonymousSessionId: null,
  channel: "web",
  status: "active",
  startedAt: "2026-07-29T10:00:00.000Z",
  lastSeenAt: "2026-07-29T10:00:00.000Z",
  expiresAt: "2026-08-05T10:00:00.000Z",
  completedAt: null,
};

const minorProfile: UserProfile = {
  userId,
  firstName: "Minor",
  ageAtOnboarding: 15,
  ageBand: "minor_14_15",
  city: "Chennai",
  state: "Tamil Nadu",
  countryCode: "IN",
  segment: "explorer",
  selfStage: "school",
  wantsAid: false,
  profileStatus: "active",
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z",
  deletedAt: null,
};

const createService = (profile: UserProfile | null = minorProfile) => {
  const consentRepository = new InMemoryGuardianConsentRepository();
  const otpStore = new InMemoryGuardianOtpStore();
  return {
    consentRepository,
    otpStore,
    service: new GuardianConsentService({
      guardianConsentRepository: consentRepository,
      journeySessionRepository: new InMemoryJourneySessionRepository(session),
      userProfileRepository: new InMemoryUserProfileRepository(profile),
      otpStore,
      clock: () => new Date("2026-07-29T10:00:00.000Z"),
      createOtp: () => "123456",
    }),
  };
};

describe("GuardianConsentService", () => {
  it("requests pending consent and stores only masked guardian phone in the contract", async () => {
    const { service, otpStore } = createService();

    const consent = await service.request({
      sessionId,
      userId,
      consent: {
        guardianPhone: "+91 98765 43210",
        studentPhone: "+91 91234 56789",
        textVersion: "guardian-consent-v1",
      },
    });

    expect(consent.status).toBe("pending");
    expect(consent.guardianPhoneLast4).toBe("3210");
    expect(otpStore.get(consent.id)?.code).toBe("123456");
  });

  it("rejects guardian phone matching the student phone", async () => {
    const { service } = createService();

    await expect(
      service.request({
        sessionId,
        userId,
        consent: {
          guardianPhone: "9876543210",
          studentPhone: "+91 98765 43210",
          textVersion: "guardian-consent-v1",
        },
      }),
    ).rejects.toMatchObject({ code: "guardian_phone_matches_student", statusCode: 400 });
  });

  it("does not request guardian consent for adult profiles", async () => {
    const { service } = createService({ ...minorProfile, ageAtOnboarding: 26, ageBand: "adult_19_plus" });

    await expect(
      service.request({
        sessionId,
        userId,
        consent: {
          guardianPhone: "9876543210",
          studentPhone: "9123456789",
          textVersion: "guardian-consent-v1",
        },
      }),
    ).rejects.toMatchObject({ code: "guardian_consent_not_required", statusCode: 409 });
  });

  it("grants pending consent with the correct OTP", async () => {
    const { service } = createService();
    const consent = await service.request({
      sessionId,
      userId,
      consent: {
        guardianPhone: "9876543210",
        studentPhone: "9123456789",
        textVersion: "guardian-consent-v1",
      },
    });

    const granted = await service.verify({
      sessionId,
      userId,
      verification: { consentId: consent.id, verificationCode: "123456" },
    });

    expect(granted.status).toBe("granted");
    expect(granted.verifiedAt).toBe("2026-07-29T10:00:00.000Z");
  });

  it("expires consent after three failed OTP attempts", async () => {
    const { service, consentRepository } = createService();
    const consent = await service.request({
      sessionId,
      userId,
      consent: {
        guardianPhone: "9876543210",
        studentPhone: "9123456789",
        textVersion: "guardian-consent-v1",
      },
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        service.verify({
          sessionId,
          userId,
          verification: { consentId: consent.id, verificationCode: "000000" },
        }),
      ).rejects.toMatchObject({ code: "invalid_guardian_otp", statusCode: 400 });
    }

    expect(consentRepository.consents.get(consent.id)?.status).toBe("expired");
  });
});
