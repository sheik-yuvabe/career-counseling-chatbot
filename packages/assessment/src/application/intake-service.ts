import { randomUUID } from "node:crypto";
import type {
  IntakeAnswer,
  IntakeQuestionsResponse,
  IntakeQuestion,
  UpsertIntakeAnswerRequest,
  UserProfile,
} from "@yuvanext/contracts";
import {
  canResumeJourneySession,
  isJourneySessionExpired,
} from "../domain/journey-session.js";
import {
  guardianConsentRequired,
  intakeQuestionNotFound,
  intakeQuestionSetNotFound,
  invalidIntakeAnswer,
  journeySessionExpired,
  journeySessionNotFound,
  journeySessionNotResumable,
  userProfileNotFound,
} from "./errors.js";
import type { IntakeRepository } from "./intake-repository.js";
import type { GuardianConsentRepository } from "./guardian-consent-repository.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";
import type { UserProfileRepository } from "./user-profile-repository.js";

export type IntakeServiceOptions = {
  intakeRepository: IntakeRepository;
  guardianConsentRepository?: GuardianConsentRepository;
  journeySessionRepository: JourneySessionRepository;
  userProfileRepository: UserProfileRepository;
  clock?: () => Date;
};

export class IntakeService {
  private readonly intakeRepository: IntakeRepository;
  private readonly guardianConsentRepository: GuardianConsentRepository | undefined;
  private readonly journeySessionRepository: JourneySessionRepository;
  private readonly userProfileRepository: UserProfileRepository;
  private readonly clock: () => Date;

  constructor(options: IntakeServiceOptions) {
    this.intakeRepository = options.intakeRepository;
    this.guardianConsentRepository = options.guardianConsentRepository;
    this.journeySessionRepository = options.journeySessionRepository;
    this.userProfileRepository = options.userProfileRepository;
    this.clock = options.clock ?? (() => new Date());
  }

  async getQuestions(input: {
    sessionId: string;
    userId: string;
    language?: string;
  }): Promise<IntakeQuestionsResponse> {
    const { profile, now } = await this.loadActiveSessionProfile(input);
    const questionSet = await this.intakeRepository.findApprovedQuestionSet({
      segment: profile.segment,
      language: input.language ?? "en",
      now: now.toISOString(),
    });

    if (!questionSet) {
      throw intakeQuestionSetNotFound();
    }
    return questionSet;
  }

  async upsertAnswer(input: {
    sessionId: string;
    userId: string;
    questionId: string;
    answer: UpsertIntakeAnswerRequest;
    language?: string;
  }): Promise<IntakeAnswer> {
    const { profile, now } = await this.loadActiveSessionProfile(input);
    const hasGuardianConsent =
      profile.ageAtOnboarding >= 18 ||
      (this.guardianConsentRepository
        ? await this.guardianConsentRepository.hasGrantedForUser(input.userId)
        : false);
    if (!hasGuardianConsent) {
      throw guardianConsentRequired();
    }

    const question = await this.intakeRepository.findQuestionForProfileSegment({
      questionId: input.questionId,
      segment: profile.segment,
      language: input.language ?? "en",
      now: now.toISOString(),
    });
    if (!question) {
      throw intakeQuestionNotFound();
    }

    const value = validateIntakeAnswer(question, input.answer.value);
    return this.intakeRepository.upsertAnswer({
      id: randomUUID(),
      userId: input.userId,
      sessionId: input.sessionId,
      questionId: input.questionId,
      questionSetVersion: question.questionSetVersion,
      answer: { value },
      answeredAt: now.toISOString(),
    });
  }

  private async loadActiveSessionProfile(input: {
    sessionId: string;
    userId: string;
  }): Promise<{ profile: UserProfile; now: Date }> {
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

const extractAllowedOptions = (options: unknown): Set<string> => {
  if (!Array.isArray(options)) {
    return new Set();
  }

  const values = options.flatMap((option) => {
    if (typeof option === "string") {
      return [option];
    }
    if (typeof option === "object" && option !== null) {
      const record = option as Record<string, unknown>;
      const candidate = record.value ?? record.option ?? record.key;
      return typeof candidate === "string" ? [candidate] : [];
    }
    return [];
  });
  return new Set(values);
};

const validateIntakeAnswer = (
  question: IntakeQuestion,
  value: string | string[],
): string | string[] => {
  const allowedOptions = extractAllowedOptions(question.options);

  if (question.responseType === "short_text") {
    if (typeof value !== "string") {
      throw invalidIntakeAnswer();
    }
    return value;
  }

  if (question.responseType === "single_choice") {
    if (typeof value !== "string" || !allowedOptions.has(value)) {
      throw invalidIntakeAnswer();
    }
    return value;
  }

  if (!Array.isArray(value) || value.some((item) => !allowedOptions.has(item))) {
    throw invalidIntakeAnswer();
  }
  return value;
};
