import { randomUUID } from "node:crypto";
import {
  StartConversationRequestSchema,
  StartConversationResponseSchema,
  UuidSchema,
  type ConversationMessage,
  type JourneyState,
  type StartConversationResponse,
} from "@yuvanext/contracts";
import { CounselorContractError, CounselorNotFoundError } from "./errors.js";
import type {
  ApprovedCopyReader,
  CounselorRepository,
  ProfileReader,
  RecommendationReader,
} from "./ports/index.js";

export type StartConversationCommand = {
  userId: string;
  request: unknown;
};

export type StartConversationConfiguration = {
  initialJourneyStep: number;
  initialJourneyStateKey: string;
  aiMode: "enabled" | "degraded" | "disabled";
};

export type StartConversationDependencies = {
  repository: CounselorRepository;
  profiles: ProfileReader;
  recommendations: RecommendationReader;
  approvedCopy: ApprovedCopyReader;
  configuration: StartConversationConfiguration;
  createId?: () => string;
  now?: () => Date;
};

export class StartConversationService {
  constructor(private readonly dependencies: StartConversationDependencies) {}

  async execute(command: StartConversationCommand): Promise<StartConversationResponse> {
    const userId = UuidSchema.parse(command.userId);
    const request = StartConversationRequestSchema.parse(command.request);
    const existing = await this.dependencies.repository.findStartResult(
      userId,
      request.idempotencyKey,
    );

    if (existing) {
      return existing;
    }

    const active = await this.dependencies.repository.findActiveStartResult(userId);
    if (active) {
      return this.dependencies.repository.saveStartResult({
        userId,
        idempotencyKey: request.idempotencyKey,
        response: active,
        welcomeMessage: this.toWelcomeMessage(active),
      });
    }

    const profile = await this.dependencies.profiles.getProfileSnapshot({
      userId,
      ...(request.profileSnapshotId ? { profileSnapshotId: request.profileSnapshotId } : {}),
    });
    if (!profile) {
      throw new CounselorNotFoundError("Profile snapshot was not found");
    }
    if (profile.userId !== userId) {
      throw new CounselorContractError("Profile snapshot does not belong to the user");
    }
    const recommendation = await this.dependencies.recommendations.getRecommendationSet({
      userId,
      profileSnapshotId: profile.snapshotId,
    });
    if (recommendation && recommendation.profileSnapshotId !== profile.snapshotId) {
      throw new CounselorContractError("Recommendation does not belong to the profile snapshot");
    }

    const copy = await this.dependencies.approvedCopy.getWelcomeCopy({
      segment: profile.segment,
      language: "en",
    });
    const createId = this.dependencies.createId ?? randomUUID;
    const now = (this.dependencies.now ?? (() => new Date()))().toISOString();
    const conversationId = createId();
    const welcomeTurnId = createId();

    const journey: JourneyState = {
      conversationId,
      currentStep: this.dependencies.configuration.initialJourneyStep,
      currentStateKey: this.dependencies.configuration.initialJourneyStateKey,
      profileSnapshotId: profile.snapshotId,
      currentRecommendationId: recommendation?.recommendationId ?? null,
      currentAssessmentRunId: null,
      isSafetyPaused: false,
      state: null,
      lockVersion: 0,
      updatedAt: now,
    };
    const response = StartConversationResponseSchema.parse({
      conversation: {
        conversationId,
        profileSnapshotId: profile.snapshotId,
        segment: profile.segment,
        status: "active",
        channel: "web",
        language: "en",
        aiMode: this.dependencies.configuration.aiMode,
        startedAt: now,
        lastTurnAt: now,
        completedAt: null,
      },
      journey,
      welcomeTurn: {
        turnId: welcomeTurnId,
        conversationId,
        text: copy.text,
        widgets: [],
        grounding: {
          toolCallIds: [],
          entityIds: [],
          recommendationIds: recommendation ? [recommendation.recommendationId] : [],
        },
        flags: [],
        createdAt: now,
      },
    });

    return this.dependencies.repository.saveStartResult({
      userId,
      idempotencyKey: request.idempotencyKey,
      response,
      welcomeMessage: this.toWelcomeMessage(response),
    });
  }

  private toWelcomeMessage(response: StartConversationResponse): ConversationMessage {
    return {
      messageId: response.welcomeTurn.turnId,
      conversationId: response.conversation.conversationId,
      turnNumber: 1,
      role: "system_copy",
      content: response.welcomeTurn.text,
      contentLanguage: response.conversation.language,
      status: "completed",
      flags: response.welcomeTurn.flags,
      createdAt: response.welcomeTurn.createdAt,
    };
  }
}
