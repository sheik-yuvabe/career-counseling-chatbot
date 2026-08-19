import { createHash } from "node:crypto";
import {
  SendConversationMessageRequestSchema,
  UuidSchema,
  type AssistantTurn,
  type Conversation,
  type ConversationMessage,
  type CounselorToolName,
  type ProfileSnapshot,
  type RecommendationSet,
  type RetrievedEvidence,
} from "@yuvanext/contracts";
import { CounselorAccessError, CounselorContractError, CounselorNotFoundError } from "./errors.js";
import type {
  AiProvider,
  AiProviderResult,
  ApprovedCopyReader,
  CounselorRepository,
  KnowledgeReader,
  ProfileReader,
  RecommendationReader,
  SafetyChecker,
} from "./ports/index.js";

export type SendConversationMessageCommand = {
  userId: string;
  conversationId: string;
  request: unknown;
};

export type SendConversationMessageConfiguration = {
  fallbackCopyKey: string;
  fallbackCopyVersion: string;
};

export type SendConversationMessageDependencies = {
  repository: CounselorRepository;
  profiles: ProfileReader;
  recommendations: RecommendationReader;
  knowledge: KnowledgeReader;
  safety: SafetyChecker;
  ai: AiProvider;
  approvedCopy: ApprovedCopyReader;
  configuration: SendConversationMessageConfiguration;
  now?: () => Date;
};

type GroundingScope = {
  entityIds: string[];
  recommendationIds: string[];
  numbers: string[];
  urls: string[];
  entries: GroundingEntry[];
};

type GroundingEntry = {
  toolCallId: string;
  entityType: string;
  entityId: string;
  displayName: string;
  allowedNumbers: Record<string, number>;
  allowedUrls: string[];
  sourceVersion: string;
};

const hashJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const deriveUuid = (value: string): string => {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const nextTurnNumber = (messages: ConversationMessage[]): number =>
  messages.reduce((maximum, message) => Math.max(maximum, message.turnNumber), 0) + 1;

const unique = (values: string[]): string[] => [...new Set(values)];

const collectGroundedNumbers = (...values: unknown[]): string[] => {
  const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  const numberPattern = /\b\d+(?:\.\d+)?\b/g;
  return unique(
    values.flatMap((value) => {
      const serialized = JSON.stringify(value);
      if (!serialized) return [];
      return serialized.replace(urlPattern, " ").replace(uuidPattern, " ").match(numberPattern) ?? [];
    }),
  );
};

export class SendConversationMessageService {
  constructor(private readonly dependencies: SendConversationMessageDependencies) {}

  async execute(command: SendConversationMessageCommand): Promise<AssistantTurn> {
    const userId = UuidSchema.parse(command.userId);
    const conversationId = UuidSchema.parse(command.conversationId);
    const request = SendConversationMessageRequestSchema.parse(command.request);
    const conversation = await this.dependencies.repository.findConversation(
      userId,
      conversationId,
    );
    if (!conversation) {
      throw new CounselorAccessError("Conversation access denied");
    }
    if (!conversation.profileSnapshotId) {
      throw new CounselorContractError("Conversation profile snapshot was not found");
    }
    const sessionId = await this.dependencies.profiles.getJourneySessionId({
      userId,
      profileSnapshotId: conversation.profileSnapshotId,
    });
    if (!sessionId) {
      throw new CounselorContractError("Profile journey session was not found");
    }

    const beforeUserMessage = await this.dependencies.repository.listMessages(
      userId,
      conversationId,
    );
    const now = (this.dependencies.now ?? (() => new Date()))().toISOString();
    const userMessageId = deriveUuid(`${conversationId}:${request.idempotencyKey}:user-message`);
    const userMessage = await this.dependencies.repository.appendMessage({
      userId,
      clientMessageId: null,
      idempotencyKey: request.idempotencyKey,
      message: {
        messageId: userMessageId,
        conversationId,
        turnNumber: nextTurnNumber(beforeUserMessage),
        role: "user",
        content: request.content,
        contentLanguage: conversation.language,
        status: "received",
        flags: [],
        createdAt: now,
      },
    });

    const safetyDecision = await this.dependencies.safety.preCheck({
      userId,
      sessionId,
      conversationId,
      sourceEventId: userMessage.messageId,
      content: userMessage.content,
      occurredAt: now,
      profileSnapshotId: conversation.profileSnapshotId,
      segment: conversation.segment,
      language: conversation.language,
    });
    if (safetyDecision.triggered) {
      return this.handleSafetyDecision(userId, conversation, userMessage, safetyDecision, now);
    }

    const messages = await this.dependencies.repository.listMessages(userId, conversationId);

    let acceptedText: string | null = null;
    let acceptedGrounding = {
      toolCallIds: [] as string[],
      entityIds: [] as string[],
      recommendationIds: [] as string[],
      entries: [] as GroundingEntry[],
    };
    if (conversation.aiMode === "enabled") {
      const { profile, recommendation, evidence, scope } = await this.loadGroundingScope(
        userId,
        conversation,
        userMessage,
      );
      const accepted = await this.generateGroundedText(
        conversation,
        userMessage,
        messages,
        profile,
        recommendation,
        evidence,
        scope,
      );
      if (accepted !== null) {
        acceptedText = accepted.text;
        const entityIds = accepted.grounding.entityIds;
        acceptedGrounding = {
          toolCallIds: unique(scope.entries.map((entry) => entry.toolCallId)),
          entityIds,
          recommendationIds: accepted.grounding.recommendationIds,
          entries: scope.entries.filter((entry) => entityIds.includes(entry.entityId)),
        };
      }
    }
    if (acceptedText === null) {
      acceptedText = (
        await this.dependencies.approvedCopy.getCopy({
          key: this.dependencies.configuration.fallbackCopyKey,
          version: this.dependencies.configuration.fallbackCopyVersion,
          language: conversation.language,
        })
      ).text;
    }

    return this.persistAssistantTurn({
      userId,
      conversation,
      text: acceptedText,
      idempotencyKey: deriveUuid(`${request.idempotencyKey}:assistant-write`),
      messageId: deriveUuid(`${request.idempotencyKey}:assistant`),
      grounding: acceptedGrounding,
      now,
    });
  }

  private async handleSafetyDecision(
    userId: string,
    conversation: Conversation,
    userMessage: ConversationMessage,
    decision: Awaited<ReturnType<SafetyChecker["preCheck"]>>,
    now: string,
  ): Promise<AssistantTurn> {
    if (!decision.approvedMessageKey || !decision.approvedMessageVersion) {
      throw new CounselorContractError("Triggered safety decision lacks approved copy");
    }
    const journey = await this.dependencies.repository.getJourneyState(userId);
    if (!journey) {
      throw new CounselorContractError("Journey state was not found for safety handling");
    }
    if (decision.createHandoff) {
      if (!decision.tier) {
        throw new CounselorContractError("Safety handoff decision lacks a tier");
      }
      if (!conversation.profileSnapshotId) {
        throw new CounselorContractError("Conversation profile snapshot was not found");
      }
      const handoffProfile = await this.dependencies.profiles.getHandoffProfile({
        userId,
        profileSnapshotId: conversation.profileSnapshotId,
      });
      if (!handoffProfile) {
        throw new CounselorContractError("Handoff profile was not found");
      }
      const messages = await this.dependencies.repository.listMessages(
        userId,
        conversation.conversationId,
      );
      await this.dependencies.safety.requestHandoff({
        idempotencyKey: deriveUuid(`${userMessage.messageId}:handoff`),
        sourceEventId: userMessage.messageId,
        userId,
        reason: decision.tier,
        user: {
          firstName: handoffProfile.firstName,
          ageBand: handoffProfile.ageBand,
          segment: handoffProfile.segment,
        },
        profile: {
          profileSnapshotId: handoffProfile.profileSnapshotId,
          ...(handoffProfile.code ? { code: handoffProfile.code } : {}),
          ...(handoffProfile.confidence ? { confidence: handoffProfile.confidence } : {}),
        },
        trigger: {
          occurredAt: userMessage.createdAt,
          excerpt: userMessage.content.slice(0, 500),
        },
        lastTurns: messages.slice(-10).map((message) => ({
          role: message.role === "system_copy" ? ("system" as const) : message.role,
          content: message.content.slice(0, 2000),
        })),
        planState: {
          currentStep: journey.currentStep,
          currentStateKey: journey.currentStateKey,
          profileSnapshotId: journey.profileSnapshotId,
          currentRecommendationId: journey.currentRecommendationId,
          currentAssessmentRunId: journey.currentAssessmentRunId,
          isSafetyPaused: journey.isSafetyPaused,
        },
        consentedContactAvailable: handoffProfile.consentedContactAvailable,
        requestCorrelationId: decision.decisionId,
      });
    }
    if (decision.pauseJourney) {
      await this.dependencies.repository.saveJourneyState(
        userId,
        {
          ...journey,
          isSafetyPaused: true,
          lockVersion: journey.lockVersion + 1,
          updatedAt: now,
        },
        journey.lockVersion,
        deriveUuid(`${userMessage.messageId}:safety-pause`),
      );
    }

    const copy = await this.dependencies.approvedCopy.getCopy({
      key: decision.approvedMessageKey,
      version: decision.approvedMessageVersion,
      language: conversation.language,
    });
    return this.persistAssistantTurn({
      userId,
      conversation,
      text: copy.text,
      idempotencyKey: deriveUuid(`${userMessage.messageId}:assistant-write`),
      messageId: deriveUuid(`${userMessage.messageId}:assistant`),
      grounding: { toolCallIds: [], entityIds: [], recommendationIds: [], entries: [] },
      now,
    });
  }

  private async loadGroundingScope(
    userId: string,
    conversation: Conversation,
    userMessage: ConversationMessage,
  ): Promise<{
    profile: ProfileSnapshot;
    recommendation: RecommendationSet | null;
    evidence: RetrievedEvidence[];
    scope: GroundingScope;
  }> {
    if (!conversation.profileSnapshotId) {
      throw new CounselorContractError("Conversation has no profile snapshot");
    }
    const profile = await this.dependencies.profiles.getProfileSnapshot({
      userId,
      profileSnapshotId: conversation.profileSnapshotId,
    });
    if (!profile) {
      throw new CounselorNotFoundError("Profile snapshot was not found");
    }
    const journey = await this.dependencies.repository.getJourneyState(userId);
    const recommendation = await this.dependencies.recommendations.getRecommendationSet({
      userId,
      profileSnapshotId: profile.snapshotId,
      ...(journey?.currentRecommendationId
        ? { recommendationId: journey.currentRecommendationId }
        : {}),
    });
    if (!recommendation) {
      return {
        profile,
        recommendation: null,
        evidence: [],
        scope: {
          entityIds: [],
          recommendationIds: [],
          numbers: [],
          urls: [],
          entries: [],
        },
      };
    }

    const evidence = await this.loadEvidence(userId, conversation, userMessage, recommendation);
    const entries = evidence.flatMap(({ toolCallId, result }) =>
      result.entities.map((entity) => {
        const item = recommendation.items.find((candidate) => candidate.entityId === entity.id);
        return {
          toolCallId,
          entityType: entity.entityType,
          entityId: entity.id,
          displayName: entity.title,
          allowedNumbers: {
            ...(item ? { rank: item.rank } : {}),
            ...(item?.fitScore === undefined ? {} : { fitScore: item.fitScore }),
          },
          allowedUrls: entity.sourceRefs.filter((source) => /^https?:\/\//i.test(source)),
          sourceVersion: entity.datasetVersion,
        };
      }),
    );
    return {
      profile,
      recommendation,
      evidence: evidence.map(({ result }) => result),
      scope: {
        entityIds: unique(recommendation.items.map((item) => item.entityId)),
        recommendationIds: [recommendation.recommendationId],
        numbers: collectGroundedNumbers(profile, recommendation, evidence),
        urls: unique(
          evidence.flatMap(({ result }) =>
            result.entities.flatMap((entity) =>
              entity.sourceRefs.filter((source) => /^https?:\/\//i.test(source)),
            ),
          ),
        ),
        entries,
      },
    };
  }

  private async loadEvidence(
    userId: string,
    conversation: Conversation,
    userMessage: ConversationMessage,
    recommendation: RecommendationSet,
  ): Promise<Array<{ toolCallId: string; result: RetrievedEvidence }>> {
    const commonInput = {
      entityIds: recommendation.items.map((item) => item.entityId),
      profileSnapshotId: recommendation.profileSnapshotId,
      recommendationId: recommendation.recommendationId,
    };
    let calls: Array<{
      toolName: CounselorToolName;
      input: Record<string, unknown>;
      execute: () => Promise<RetrievedEvidence>;
    }>;
    switch (recommendation.kind) {
      case "career":
        calls = recommendation.items.map((item) => ({
          toolName: "get_career",
          input: { entityId: item.entityId },
          execute: () => this.dependencies.knowledge.getCareer({ entityId: item.entityId }),
        }));
        break;
      case "stream":
        calls = [
          {
            toolName: "get_streams",
            input: commonInput,
            execute: () => this.dependencies.knowledge.getStreams(commonInput),
          },
        ];
        break;
      case "college":
        calls = [
          {
            toolName: "get_colleges",
            input: commonInput,
            execute: () => this.dependencies.knowledge.getColleges(commonInput),
          },
        ];
        break;
      case "aid":
        calls = [
          {
            toolName: "get_aid_schemes",
            input: commonInput,
            execute: () => this.dependencies.knowledge.getAidSchemes(commonInput),
          },
        ];
        break;
      default:
        return [];
    }
    return Promise.all(
      calls.map(async (call, index) => {
        const startedAt = (this.dependencies.now ?? (() => new Date()))();
        const result = await call.execute();
        const completedAt = (this.dependencies.now ?? (() => new Date()))();
        const toolCallId = deriveUuid(
          `${userMessage.messageId}:${call.toolName}:${index}:${hashJson(call.input)}`,
        );
        await this.dependencies.repository.recordToolCall(userId, {
          toolCallId,
          conversationId: conversation.conversationId,
          requestMessageId: userMessage.messageId,
          toolName: call.toolName,
          toolSchemaVersion: "1",
          input: call.input,
          inputHash: hashJson(call.input),
          outputSnapshot: { ...result },
          outputHash: hashJson(result),
          sourceVersions: result.sourceVersions,
          status: "succeeded",
          latencyMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
          errorCode: null,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });
        return { toolCallId, result };
      }),
    );
  }

  private async generateGroundedText(
    conversation: Conversation,
    userMessage: ConversationMessage,
    recentMessages: ConversationMessage[],
    profile: ProfileSnapshot,
    recommendation: RecommendationSet | null,
    groundingEvidence: RetrievedEvidence[],
    scope: GroundingScope,
  ): Promise<Extract<AiProviderResult, { status: "completed" }> | null> {
    let violations: string[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let result: AiProviderResult;
      try {
        result = await this.dependencies.ai.generateDraft({
          conversationId: conversation.conversationId,
          userMessage: userMessage.content,
          profile,
          recommendation,
          groundingEvidence,
          recentMessages,
          groundingViolations: violations,
        });
      } catch {
        return null;
      }
      if (result.status !== "completed") {
        return null;
      }

      violations = this.validateGrounding(result, scope);
      if (violations.length === 0) {
        return result;
      }
    }
    return null;
  }

  private validateGrounding(
    result: Extract<AiProviderResult, { status: "completed" }>,
    scope: GroundingScope,
  ): string[] {
    const violations: string[] = [];
    const allowedEntities = new Set(scope.entityIds);
    const allowedRecommendations = new Set(scope.recommendationIds);
    for (const entityId of result.grounding.entityIds) {
      if (!allowedEntities.has(entityId)) {
        violations.push(`unsupported_entity:${entityId}`);
      }
    }
    for (const recommendationId of result.grounding.recommendationIds) {
      if (!allowedRecommendations.has(recommendationId)) {
        violations.push(`unsupported_recommendation:${recommendationId}`);
      }
    }

    const urls = result.text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
    const allowedUrls = new Set(scope.urls);
    for (const rawUrl of urls) {
      const url = rawUrl.replace(/[),.;]+$/, "");
      if (!allowedUrls.has(url)) {
        violations.push(`unsupported_url:${url}`);
      }
    }

    const textWithoutUrls = result.text.replace(/https?:\/\/[^\s<>"']+/gi, "");
    const numbers = textWithoutUrls.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
    const allowedNumbers = new Set(scope.numbers);
    for (const number of numbers) {
      if (!allowedNumbers.has(number)) {
        violations.push(`unsupported_number:${number}`);
      }
    }
    return unique(violations);
  }

  private async persistAssistantTurn(input: {
    userId: string;
    conversation: Conversation;
    text: string;
    idempotencyKey: string;
    messageId: string;
    grounding: {
      toolCallIds: string[];
      entityIds: string[];
      recommendationIds: string[];
      entries: GroundingEntry[];
    };
    now: string;
  }): Promise<AssistantTurn> {
    const messages = await this.dependencies.repository.listMessages(
      input.userId,
      input.conversation.conversationId,
    );
    const stored = await this.dependencies.repository.appendMessage({
      userId: input.userId,
      clientMessageId: null,
      idempotencyKey: input.idempotencyKey,
      message: {
        messageId: input.messageId,
        conversationId: input.conversation.conversationId,
        turnNumber: nextTurnNumber(messages),
        role: "assistant",
        content: input.text,
        contentLanguage: input.conversation.language,
        status: "completed",
        flags: [],
        createdAt: input.now,
      },
    });
    await this.dependencies.repository.recordMessageGrounding(
      input.userId,
      input.grounding.entries.map((entry) => ({
        groundingId: deriveUuid(`${stored.messageId}:${entry.toolCallId}:${entry.entityId}`),
        assistantMessageId: stored.messageId,
        ...entry,
      })),
    );
    return {
      turnId: stored.messageId,
      conversationId: stored.conversationId,
      text: stored.content,
      widgets: [],
      grounding: {
        toolCallIds: input.grounding.toolCallIds,
        entityIds: input.grounding.entityIds,
        recommendationIds: input.grounding.recommendationIds,
      },
      flags: stored.flags,
      createdAt: stored.createdAt,
    };
  }
}
