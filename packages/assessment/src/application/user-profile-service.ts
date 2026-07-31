import type { UpsertUserProfileRequest, UserProfile } from "@yuvanext/contracts";
import {
  canResumeJourneySession,
  isJourneySessionExpired,
} from "../domain/journey-session.js";
import {
  calculateAgeAtOnboarding,
  deriveAgeBand,
  deriveSegment,
} from "../domain/user-profile.js";
import {
  journeySessionExpired,
  journeySessionNotFound,
  journeySessionNotResumable,
  under12Ineligible,
  userProfileNotFound,
} from "./errors.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";
import type { UserProfileRepository } from "./user-profile-repository.js";

export type UserProfileServiceOptions = {
  userProfileRepository: UserProfileRepository;
  journeySessionRepository: JourneySessionRepository;
  clock?: () => Date;
};

export class UserProfileService {
  private readonly userProfileRepository: UserProfileRepository;
  private readonly journeySessionRepository: JourneySessionRepository;
  private readonly clock: () => Date;

  constructor(options: UserProfileServiceOptions) {
    this.userProfileRepository = options.userProfileRepository;
    this.journeySessionRepository = options.journeySessionRepository;
    this.clock = options.clock ?? (() => new Date());
  }

  async upsertForSession(input: {
    sessionId: string;
    userId: string;
    profile: UpsertUserProfileRequest;
  }): Promise<UserProfile> {
    const now = this.clock();
    const session = await this.journeySessionRepository.findByIdForUser({
      sessionId: input.sessionId,
      userId: input.userId,
    });

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

    const age =
      input.profile.dateOfBirth !== undefined
        ? calculateAgeAtOnboarding(input.profile.dateOfBirth, now)
        : input.profile.ageAtOnboarding;

    if (age === undefined || age < 12) {
      throw under12Ineligible();
    }

    return this.userProfileRepository.upsert({
      userId: input.userId,
      firstName: input.profile.firstName,
      ageAtOnboarding: age,
      ageBand: deriveAgeBand(age),
      city: input.profile.city,
      state: input.profile.state,
      countryCode: input.profile.countryCode.toUpperCase(),
      segment: deriveSegment({ age, selfStage: input.profile.selfStage }),
      selfStage: input.profile.selfStage,
      wantsAid: input.profile.wantsAid,
      profileStatus: "active",
      now: now.toISOString(),
    });
  }

  async getForSession(input: { sessionId: string; userId: string }): Promise<UserProfile> {
    const session = await this.journeySessionRepository.findByIdForUser(input);
    if (!session) {
      throw journeySessionNotFound();
    }

    const profile = await this.userProfileRepository.findByUserId(input.userId);
    if (!profile) {
      throw userProfileNotFound();
    }
    return profile;
  }
}
