import { randomUUID } from "node:crypto";
import type {
  GuardianConsent,
  GuardianConsentStatusResponse,
  RequestGuardianConsentRequest,
  VerifyGuardianConsentRequest,
} from "@yuvanext/contracts";
import {
  createGuardianOtp,
  createGuardianOtpExpiration,
  isMinorAge,
  normalizePhone,
  phoneLast4,
  protectedPhoneHash,
  providerReferenceHash,
} from "../domain/guardian-consent.js";
import {
  canResumeJourneySession,
  isJourneySessionExpired,
} from "../domain/journey-session.js";
import {
  guardianConsentNotFound,
  guardianConsentNotPending,
  guardianConsentNotRequired,
  guardianPhoneMatchesStudent,
  invalidGuardianOtp,
  journeySessionExpired,
  journeySessionNotFound,
  journeySessionNotResumable,
  userProfileNotFound,
} from "./errors.js";
import type { GuardianConsentRepository } from "./guardian-consent-repository.js";
import type { GuardianOtpStore } from "./guardian-otp-store.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";
import type { UserProfileRepository } from "./user-profile-repository.js";

export type GuardianConsentServiceOptions = {
  guardianConsentRepository: GuardianConsentRepository;
  journeySessionRepository: JourneySessionRepository;
  userProfileRepository: UserProfileRepository;
  otpStore: GuardianOtpStore;
  clock?: () => Date;
  createOtp?: () => string;
};

export class GuardianConsentService {
  private readonly guardianConsentRepository: GuardianConsentRepository;
  private readonly journeySessionRepository: JourneySessionRepository;
  private readonly userProfileRepository: UserProfileRepository;
  private readonly otpStore: GuardianOtpStore;
  private readonly clock: () => Date;
  private readonly createOtp: () => string;

  constructor(options: GuardianConsentServiceOptions) {
    this.guardianConsentRepository = options.guardianConsentRepository;
    this.journeySessionRepository = options.journeySessionRepository;
    this.userProfileRepository = options.userProfileRepository;
    this.otpStore = options.otpStore;
    this.clock = options.clock ?? (() => new Date());
    this.createOtp = options.createOtp ?? createGuardianOtp;
  }

  async request(input: {
    sessionId: string;
    userId: string;
    consent: RequestGuardianConsentRequest;
  }): Promise<GuardianConsent> {
    const { profile, now } = await this.loadActiveSessionProfile(input);
    if (!isMinorAge(profile.ageAtOnboarding)) {
      throw guardianConsentNotRequired();
    }

    const normalizedGuardianPhone = normalizePhone(input.consent.guardianPhone);
    const normalizedStudentPhone = normalizePhone(input.consent.studentPhone);
    if (normalizedGuardianPhone === normalizedStudentPhone) {
      throw guardianPhoneMatchesStudent();
    }

    const consentId = randomUUID();
    const consent = await this.guardianConsentRepository.createPending({
      id: consentId,
      userId: input.userId,
      guardianPhoneHash: protectedPhoneHash(normalizedGuardianPhone),
      guardianPhoneLast4: phoneLast4(normalizedGuardianPhone),
      status: "pending",
      textVersion: input.consent.textVersion,
      providerReferenceHash: providerReferenceHash(consentId),
      now: now.toISOString(),
    });

    this.otpStore.save({
      consentId: consent.id,
      code: this.createOtp(),
      expiresAt: createGuardianOtpExpiration(now).toISOString(),
      attempts: 0,
    });
    return consent;
  }

  async verify(input: {
    sessionId: string;
    userId: string;
    verification: VerifyGuardianConsentRequest;
  }): Promise<GuardianConsent> {
    const { now } = await this.loadActiveSessionProfile(input);
    const consent = await this.guardianConsentRepository.findByIdForUser({
      consentId: input.verification.consentId,
      userId: input.userId,
    });
    if (!consent) {
      throw guardianConsentNotFound();
    }
    if (consent.status !== "pending") {
      throw guardianConsentNotPending();
    }

    const challenge = this.otpStore.get(input.verification.consentId);
    if (!challenge || new Date(challenge.expiresAt).getTime() <= now.getTime()) {
      await this.guardianConsentRepository.expire({
        consentId: input.verification.consentId,
        userId: input.userId,
        now: now.toISOString(),
      });
      this.otpStore.delete(input.verification.consentId);
      throw invalidGuardianOtp();
    }

    if (challenge.code !== input.verification.verificationCode) {
      const updated = this.otpStore.recordFailedAttempt(input.verification.consentId);
      if (updated && updated.attempts >= 3) {
        await this.guardianConsentRepository.expire({
          consentId: input.verification.consentId,
          userId: input.userId,
          now: now.toISOString(),
        });
        this.otpStore.delete(input.verification.consentId);
      }
      throw invalidGuardianOtp();
    }

    this.otpStore.delete(input.verification.consentId);
    return this.guardianConsentRepository.grant({
      consentId: input.verification.consentId,
      userId: input.userId,
      now: now.toISOString(),
    });
  }

  async getStatus(input: {
    sessionId: string;
    userId: string;
  }): Promise<GuardianConsentStatusResponse> {
    const { profile } = await this.loadActiveSessionProfile(input);
    return {
      consentRequired: isMinorAge(profile.ageAtOnboarding),
      consent: await this.guardianConsentRepository.findLatestForUser(input.userId),
    };
  }

  private async loadActiveSessionProfile(input: {
    sessionId: string;
    userId: string;
  }): Promise<{ profile: NonNullable<Awaited<ReturnType<UserProfileRepository["findByUserId"]>>>; now: Date }> {
    const now = this.clock();
    const session = await this.journeySessionRepository.findByIdForUser(input);
    if (!session) {
      throw journeySessionNotFound();
    }
    if (isJourneySessionExpired(session, now)) {
      await this.journeySessionRepository.markExpired({
        sessionId: input.sessionId,
        userId: input.userId,
        now: now.toISOString(),
      });
      throw journeySessionExpired();
    }
    if (!canResumeJourneySession(session.status)) {
      throw journeySessionNotResumable();
    }

    const profile = await this.userProfileRepository.findByUserId(input.userId);
    if (!profile) {
      throw userProfileNotFound();
    }
    return { profile, now };
  }
}
