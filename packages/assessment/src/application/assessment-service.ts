import { randomUUID } from "node:crypto";
import type {
  AssessmentNextResponse,
  AssessmentResponseSaveResponse,
  AssessmentResult,
  AssessmentRun,
  ProfileSnapshot,
  StartAssessmentRunRequest,
  SubmitAssessmentResponseRequest,
  UserProfile,
} from "@yuvanext/contracts";
import {
  canResumeJourneySession,
  createJourneySessionExpiration,
  isJourneySessionExpired,
} from "../domain/journey-session.js";
import { scoreRiasecResponses, sha256Json } from "../domain/scoring.js";
import {
  assessmentItemNotFound,
  assessmentResultNotFound,
  assessmentRunIncomplete,
  assessmentRunNotActive,
  assessmentRunNotFound,
  assessmentVersionNotFound,
  guardianConsentRequired,
  invalidAssessmentResponse,
  journeySessionExpired,
  journeySessionNotFound,
  journeySessionNotResumable,
  userProfileNotFound,
} from "./errors.js";
import type { AssessmentRepository } from "./assessment-repository.js";
import type { GuardianConsentRepository } from "./guardian-consent-repository.js";
import type { JourneySessionRepository } from "./journey-session-repository.js";
import type { UserProfileRepository } from "./user-profile-repository.js";

export type AssessmentServiceOptions = {
  assessmentRepository: AssessmentRepository;
  journeySessionRepository: JourneySessionRepository;
  userProfileRepository: UserProfileRepository;
  guardianConsentRepository: GuardianConsentRepository;
  clock?: () => Date;
};

export class AssessmentService {
  private readonly assessmentRepository: AssessmentRepository;
  private readonly journeySessionRepository: JourneySessionRepository;
  private readonly userProfileRepository: UserProfileRepository;
  private readonly guardianConsentRepository: GuardianConsentRepository;
  private readonly clock: () => Date;

  constructor(options: AssessmentServiceOptions) {
    this.assessmentRepository = options.assessmentRepository;
    this.journeySessionRepository = options.journeySessionRepository;
    this.userProfileRepository = options.userProfileRepository;
    this.guardianConsentRepository = options.guardianConsentRepository;
    this.clock = options.clock ?? (() => new Date());
  }

  async startRun(input: {
    sessionId: string;
    userId: string;
    request: StartAssessmentRunRequest;
  }): Promise<AssessmentRun> {
    const { profile, now } = await this.loadActiveSessionProfile(input);
    await this.ensureConsentIfMinor(profile);
    const version = await this.assessmentRepository.findActiveVersion({
      instrumentCode: input.request.instrumentCode,
      language: input.request.language,
      ageAtOnboarding: profile.ageAtOnboarding,
      now: now.toISOString(),
    });
    if (!version) {
      throw assessmentVersionNotFound();
    }

    return this.assessmentRepository.createRun({
      id: randomUUID(),
      userId: input.userId,
      journeySessionId: input.sessionId,
      assessmentVersionId: version.id,
      segment: profile.segment,
      status: "active",
      currentPosition: 0,
      startedAt: now.toISOString(),
      resumeExpiresAt: createJourneySessionExpiration(now).toISOString(),
      attemptNumber: 1,
      createdAt: now.toISOString(),
    });
  }

  async getNext(input: { runId: string; userId: string }): Promise<AssessmentNextResponse> {
    const run = await this.loadRun(input);
    const items = await this.assessmentRepository.listRunItems(run.id);
    const answered = await this.assessmentRepository.listAnsweredItemIds(run.id);
    const nextPosition = items.findIndex((item) => !answered.has(item.id));
    const batchSize = run.segment === "explorer" ? 5 : 10;
    const remainingItems = nextPosition === -1 ? [] : items.slice(nextPosition, nextPosition + batchSize);

    return {
      run,
      progress: {
        answered: answered.size,
        total: items.length,
        nextPosition: nextPosition === -1 ? items.length : nextPosition,
        isComplete: answered.size >= items.length && items.length > 0,
      },
      items: remainingItems,
    };
  }

  async submitResponse(input: {
    runId: string;
    userId: string;
    response: SubmitAssessmentResponseRequest;
  }): Promise<AssessmentResponseSaveResponse> {
    const run = await this.loadRun(input);
    if (run.status !== "active") {
      throw assessmentRunNotActive();
    }

    const item = await this.assessmentRepository.findItemForRun({
      runId: input.runId,
      itemId: input.response.itemId,
    });
    if (!item) {
      throw assessmentItemNotFound();
    }

    const option = input.response.selectedOptionId
      ? await this.assessmentRepository.findOptionForItem({
          itemId: item.id,
          optionId: input.response.selectedOptionId,
        })
      : null;
    if (input.response.selectedOptionId && !option) {
      throw invalidAssessmentResponse();
    }
    validateResponseShape(item.itemType, input.response);

    const now = this.clock();
    const response = await this.assessmentRepository.upsertResponse({
      id: randomUUID(),
      assessmentRunId: run.id,
      itemId: item.id,
      selectedOptionId: input.response.selectedOptionId ?? null,
      responseValue: input.response.responseValue ?? null,
      responseJson: input.response.responseJson ?? null,
      latencyMs: input.response.latencyMs ?? null,
      clientAnswerId: input.response.clientAnswerId,
      answeredAt: input.response.answeredAt ?? now.toISOString(),
      receivedAt: now.toISOString(),
    });

    const next = await this.getNext(input);
    const updatedRun = await this.assessmentRepository.updateRunProgress({
      runId: run.id,
      currentPosition: next.progress.nextPosition,
      status: next.progress.isComplete ? "completed" : "active",
      now: now.toISOString(),
    });
    return { response, next: { ...next, run: updatedRun } };
  }

  async scoreRun(input: { runId: string; userId: string }): Promise<AssessmentResult> {
    const run = await this.loadRun(input);
    const next = await this.getNext(input);
    if (!next.progress.isComplete) {
      throw assessmentRunIncomplete();
    }

    const existing = await this.assessmentRepository.findResultByRunForUser(input);
    if (existing) {
      return existing;
    }

    const scoringResponses = await this.assessmentRepository.listScoringResponses(run.id);
    const result = scoreRiasecResponses({
      runId: run.id,
      userId: input.userId,
      instrumentCode: run.instrumentCode,
      instrumentVersion: run.instrumentVersion,
      algorithmVersion: run.algorithmVersion,
      responses: scoringResponses,
      resultId: randomUUID(),
      createdAt: this.clock().toISOString(),
    });
    return this.assessmentRepository.createResult(result);
  }

  async buildProfileSnapshot(input: {
    sessionId: string;
    userId: string;
    runId: string;
  }): Promise<ProfileSnapshot> {
    const { profile, now } = await this.loadActiveSessionProfile(input);
    const result = await this.assessmentRepository.findResultByRunForUser({
      runId: input.runId,
      userId: input.userId,
    });
    if (!result) {
      throw assessmentResultNotFound();
    }

    const intakeSummary = await this.assessmentRepository.getIntakeSummary(input);
    const profileVersion = await this.assessmentRepository.getNextProfileVersion(input.userId);
    const resultSummary = {
      riasec: {
        rawScores: result.rawScores,
        normalizedScores: result.normalizedScores,
        code: result.resultCode,
        confidence: result.confidence,
        closeScores: result.closeScores,
        instrumentCode: result.instrumentCode,
        instrumentVersion: result.instrumentVersion,
      },
    };
    const payload = { profile, intakeSummary, resultSummary, profileVersion };
    return this.assessmentRepository.createProfileSnapshot({
      id: randomUUID(),
      userId: input.userId,
      profileVersion,
      profile,
      intakeSummary,
      resultSummary,
      algorithmVersion: "profile-builder-v1",
      snapshotSchemaVersion: 1,
      payloadHash: sha256Json(payload),
      sourceResultId: result.id,
      createdAt: now.toISOString(),
    });
  }

  private async loadRun(input: { runId: string; userId: string }): Promise<AssessmentRun> {
    const run = await this.assessmentRepository.findRunByIdForUser(input);
    if (!run) {
      throw assessmentRunNotFound();
    }
    return run;
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

  private async ensureConsentIfMinor(profile: UserProfile): Promise<void> {
    if (profile.ageAtOnboarding >= 18) {
      return;
    }
    if (!(await this.guardianConsentRepository.hasGrantedForUser(profile.userId))) {
      throw guardianConsentRequired();
    }
  }
}

const validateResponseShape = (
  itemType: string,
  response: SubmitAssessmentResponseRequest,
): void => {
  if (itemType === "likert" || itemType === "qc") {
    if (response.responseValue === undefined) {
      throw invalidAssessmentResponse();
    }
    return;
  }

  if (!response.selectedOptionId) {
    throw invalidAssessmentResponse();
  }
};
