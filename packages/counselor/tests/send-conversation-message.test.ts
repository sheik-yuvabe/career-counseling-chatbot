import {
  counselorFixtureIds,
  validAssistantTurn,
  validCatalogEntity,
  validConversation,
  validHandoffPacket,
  validJourneyState,
  validProfileSnapshot,
  validRecommendationSet,
  validRetrievedEvidence,
  validSafetyDecision,
} from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import {
  CounselorAccessError,
  FixtureAiProvider,
  FixtureApprovedCopyReader,
  FixtureKnowledgeReader,
  FixtureProfileReader,
  FixtureRecommendationReader,
  FixtureSafetyChecker,
  InMemoryCounselorRepository,
  SendConversationMessageService,
  type AiProvider,
  type KnowledgeReader,
  type SafetyChecker,
} from "../src/index.js";

const userId = validProfileSnapshot.userId;
const otherUserId = "00000000-0000-4000-8000-000000000499";
const idempotencyKey = "00000000-0000-4000-8000-000000000421";
const now = "2026-07-28T09:05:00.000Z";
const fallbackText = "Synthetic approved fallback.";
const safetyText = "Synthetic approved safety response.";

const request = {
  content: "Explain my top recommendation.",
  idempotencyKey,
};

const seedConversation = async (
  repository: InMemoryCounselorRepository,
  aiMode: "enabled" | "degraded" | "disabled",
) => {
  const conversation = { ...validConversation, aiMode };
  await repository.saveStartResult({
    userId,
    idempotencyKey: counselorFixtureIds.idempotencyKey,
    response: {
      conversation,
      journey: validJourneyState,
      welcomeTurn: validAssistantTurn,
    },
    welcomeMessage: {
      messageId: validAssistantTurn.turnId,
      conversationId: conversation.conversationId,
      turnNumber: 1,
      role: "system_copy",
      content: validAssistantTurn.text,
      contentLanguage: "en",
      status: "completed",
      flags: [],
      createdAt: validAssistantTurn.createdAt,
    },
  });
  return conversation;
};

const createService = async (input?: {
  aiMode?: "enabled" | "degraded" | "disabled";
  ai?: AiProvider;
  knowledge?: KnowledgeReader;
  safety?: SafetyChecker;
}) => {
  const repository = new InMemoryCounselorRepository();
  const conversation = await seedConversation(repository, input?.aiMode ?? "disabled");
  const service = new SendConversationMessageService({
    repository,
    profiles: new FixtureProfileReader([validProfileSnapshot]),
    recommendations: new FixtureRecommendationReader([validRecommendationSet]),
    knowledge: input?.knowledge ?? new FixtureKnowledgeReader(validRetrievedEvidence),
    safety: input?.safety ?? new FixtureSafetyChecker(validSafetyDecision, validHandoffPacket),
    ai: input?.ai ?? new FixtureAiProvider({ status: "disabled" }),
    approvedCopy: new FixtureApprovedCopyReader([
      {
        segment: "pathfinder",
        language: "en",
        key: "fallback",
        version: "1",
        text: fallbackText,
      },
      {
        segment: "pathfinder",
        language: "en",
        key: "safety_pause",
        version: "1",
        text: safetyText,
      },
    ]),
    configuration: {
      fallbackCopyKey: "fallback",
      fallbackCopyVersion: "1",
    },
    now: () => new Date(now),
  });
  return { conversation, repository, service };
};

describe("SendConversationMessageService", () => {
  it("runs the safety check before requesting an AI draft", async () => {
    const order: string[] = [];
    const safety: SafetyChecker = {
      preCheck: vi.fn(() => {
        order.push("safety");
        return Promise.resolve(validSafetyDecision);
      }),
      requestHandoff: vi.fn(() => Promise.resolve(validHandoffPacket)),
    };
    const ai: AiProvider = {
      generateDraft: vi.fn(() => {
        order.push("ai");
        return Promise.resolve({
          status: "completed" as const,
          text: "Your fit score is 0.91 and this option is ranked 1.",
          grounding: {
            entityIds: [counselorFixtureIds.entityId],
            recommendationIds: [counselorFixtureIds.recommendationId],
          },
        });
      }),
    };
    const { conversation, repository, service } = await createService({
      aiMode: "enabled",
      ai,
      safety,
    });
    const recordToolCall = vi.spyOn(repository, "recordToolCall");
    const recordMessageGrounding = vi.spyOn(repository, "recordMessageGrounding");

    const result = await service.execute({
      userId,
      conversationId: conversation.conversationId,
      request,
    });

    expect(order).toEqual(["safety", "ai"]);
    expect(result.text).toContain("0.91");
    expect(result.grounding).toMatchObject({
      entityIds: [counselorFixtureIds.entityId],
      recommendationIds: [counselorFixtureIds.recommendationId],
    });
    expect(result.grounding.toolCallIds).toHaveLength(1);
    expect(recordToolCall).toHaveBeenCalledOnce();
    expect(recordMessageGrounding).toHaveBeenCalledWith(userId, [
      expect.objectContaining({
        assistantMessageId: result.turnId,
        entityId: counselorFixtureIds.entityId,
        toolCallId: result.grounding.toolCallIds[0],
      }),
    ]);
  });

  it("deduplicates a user message and its assistant turn across retries", async () => {
    const { conversation, repository, service } = await createService();
    const command = {
      userId,
      conversationId: conversation.conversationId,
      request,
    };

    const first = await service.execute(command);
    const retry = await service.execute(command);

    expect(retry).toEqual(first);
    await expect(
      repository.listMessages(userId, conversation.conversationId),
    ).resolves.toHaveLength(3);
  });

  it("rejects access by a user who does not own the conversation", async () => {
    const { conversation, service } = await createService();

    await expect(
      service.execute({
        userId: otherUserId,
        conversationId: conversation.conversationId,
        request,
      }),
    ).rejects.toBeInstanceOf(CounselorAccessError);
  });

  it("uses approved safety copy, requests handoff, pauses the journey, and skips AI", async () => {
    const generateDraft = vi.fn(() => Promise.resolve({ status: "disabled" as const }));
    const ai: AiProvider = {
      generateDraft,
    };
    const requestHandoff = vi.fn<SafetyChecker["requestHandoff"]>(() =>
      Promise.resolve(validHandoffPacket),
    );
    const safety: SafetyChecker = {
      preCheck: vi.fn(() =>
        Promise.resolve({
          ...validSafetyDecision,
          triggered: true,
          tier: "tier_2" as const,
          approvedMessageKey: "safety_pause",
          approvedMessageVersion: "1",
          pauseJourney: true,
          createHandoff: true,
        }),
      ),
      requestHandoff,
    };
    const { conversation, repository, service } = await createService({
      aiMode: "enabled",
      ai,
      safety,
    });

    const result = await service.execute({
      userId,
      conversationId: conversation.conversationId,
      request,
    });

    expect(result.text).toBe(safetyText);
    expect(result.grounding.entityIds).toEqual([]);
    expect(requestHandoff).toHaveBeenCalledOnce();
    const handoffInput = requestHandoff.mock.calls[0]?.[0];
    expect(handoffInput).toMatchObject({
      userId,
      reason: "tier_2",
      user: {
        firstName: "Synthetic",
        ageBand: validProfileSnapshot.ageBand,
        segment: validProfileSnapshot.segment,
      },
      profile: {
        profileSnapshotId: validProfileSnapshot.snapshotId,
        code: validProfileSnapshot.riasec?.code,
        confidence: validProfileSnapshot.riasec?.confidence,
      },
      trigger: {
        occurredAt: now,
        excerpt: request.content,
      },
      consentedContactAvailable: true,
    });
    expect(handoffInput?.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(handoffInput?.requestCorrelationId).toBe(validSafetyDecision.decisionId);
    expect(handoffInput?.lastTurns.at(-1)).toMatchObject({
      role: "user",
      content: request.content,
    });
    expect(handoffInput?.planState).toMatchObject({
      currentStep: validJourneyState.currentStep,
      currentStateKey: validJourneyState.currentStateKey,
    });
    expect(generateDraft).not.toHaveBeenCalled();
    await expect(repository.getJourneyState(userId)).resolves.toMatchObject({
      isSafetyPaused: true,
      lockVersion: validJourneyState.lockVersion + 1,
    });
  });

  it.each([
    { status: "disabled" as const },
    { status: "timed_out" as const, errorCode: "synthetic_timeout" },
    { status: "failed" as const, errorCode: "synthetic_failure" },
  ])("uses approved fallback copy when AI returns $status", async (aiResult) => {
    const { conversation, service } = await createService({
      aiMode: "enabled",
      ai: new FixtureAiProvider(aiResult),
    });

    const result = await service.execute({
      userId,
      conversationId: conversation.conversationId,
      request,
    });

    expect(result.text).toBe(fallbackText);
    expect(result.grounding).toMatchObject({
      entityIds: [],
      recommendationIds: [],
    });
  });

  it("retries unsupported grounding once and then persists only approved fallback copy", async () => {
    const generateDraft = vi.fn((input: Parameters<AiProvider["generateDraft"]>[0]) => {
      void input;
      return Promise.resolve({
        status: "completed" as const,
        text: "Your fit score is 99.",
        grounding: {
          entityIds: ["00000000-0000-4000-8000-000000000498"],
          recommendationIds: [counselorFixtureIds.recommendationId],
        },
      });
    });
    const { conversation, repository, service } = await createService({
      aiMode: "enabled",
      ai: { generateDraft },
    });

    const result = await service.execute({
      userId,
      conversationId: conversation.conversationId,
      request,
    });

    expect(generateDraft).toHaveBeenCalledTimes(2);
    expect(generateDraft.mock.calls[1]?.[0].groundingViolations).toEqual(
      expect.arrayContaining([
        "unsupported_entity:00000000-0000-4000-8000-000000000498",
        "unsupported_number:99",
      ]),
    );
    expect(result.text).toBe(fallbackText);
    const messages = await repository.listMessages(userId, conversation.conversationId);
    expect(messages.at(-1)?.content).toBe(fallbackText);
    expect(messages.some((message) => message.content.includes("99"))).toBe(false);
  });

  it("accepts numeric facts present in grounded Module 3 evidence", async () => {
    const evidence = {
      ...validRetrievedEvidence,
      entities: [
        {
          ...validCatalogEntity,
          title: "Synthetic College 631",
        },
      ],
    };
    const generateDraft = vi.fn(() =>
      Promise.resolve({
        status: "completed" as const,
        text: "Synthetic College 631 is one of your grounded recommendations.",
        grounding: {
          entityIds: [counselorFixtureIds.entityId],
          recommendationIds: [counselorFixtureIds.recommendationId],
        },
      }),
    );
    const { conversation, service } = await createService({
      aiMode: "enabled",
      ai: { generateDraft },
      knowledge: new FixtureKnowledgeReader(evidence),
    });

    const result = await service.execute({
      userId,
      conversationId: conversation.conversationId,
      request,
    });

    expect(generateDraft).toHaveBeenCalledOnce();
    expect(result.text).toContain("631");
  });
});
