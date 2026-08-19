import {
  counselorFixtureIds,
  validCatalogEntity,
  validCreateJourneyEventRequest,
  validHandoffPacket,
  validProfileSnapshot,
  validRecommendationSet,
  validReportSnapshot,
  validRetrievedEvidence,
  validSafetyDecision,
  validStartConversationRequest,
} from "@yuvanext/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  CounselorNotFoundError,
  FixtureAiProvider,
  FixtureApprovedCopyReader,
  FixtureKnowledgeReader,
  FixtureProfileReader,
  FixtureRecommendationReader,
  FixtureReportRenderer,
  FixtureSafetyChecker,
  InMemoryCounselorRepository,
  StartConversationService,
} from "../src/index.js";

const userId = validProfileSnapshot.userId;
const secondIdempotencyKey = "00000000-0000-4000-8000-000000000417";
const journeyEventId = "00000000-0000-4000-8000-000000000418";

const createService = (
  repository = new InMemoryCounselorRepository(),
  profile = validProfileSnapshot,
) => {
  const ids = [counselorFixtureIds.conversationId, counselorFixtureIds.assistantTurnId];

  return {
    repository,
    service: new StartConversationService({
      repository,
      profiles: new FixtureProfileReader([profile]),
      recommendations: new FixtureRecommendationReader([validRecommendationSet]),
      approvedCopy: new FixtureApprovedCopyReader([
        {
          segment: "pathfinder",
          language: "en",
          key: "synthetic_welcome",
          version: "1",
          text: "Synthetic approved welcome.",
        },
      ]),
      configuration: {
        initialJourneyStep: 1,
        initialJourneyStateKey: "synthetic_welcome",
        aiMode: "disabled",
      },
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("Fixture ID sequence exhausted");
        }
        return id;
      },
      now: () => new Date("2026-07-28T09:00:00.000Z"),
    }),
  };
};

describe("Module 4 fixture adapters", () => {
  it("returns contract-validated upstream fixtures", async () => {
    const profiles = new FixtureProfileReader([validProfileSnapshot]);
    const recommendations = new FixtureRecommendationReader([validRecommendationSet]);
    const knowledge = new FixtureKnowledgeReader(validRetrievedEvidence);
    const safety = new FixtureSafetyChecker(validSafetyDecision, validHandoffPacket);

    await expect(
      profiles.getProfileSnapshot({
        userId,
        profileSnapshotId: validProfileSnapshot.snapshotId,
      }),
    ).resolves.toEqual(validProfileSnapshot);
    await expect(
      recommendations.getRecommendationSet({
        userId,
        profileSnapshotId: validProfileSnapshot.snapshotId,
      }),
    ).resolves.toEqual(validRecommendationSet);
    await expect(knowledge.getCareer({ entityId: validCatalogEntity.id })).resolves.toMatchObject({
      entities: [validCatalogEntity],
    });
    await expect(
      safety.preCheck({
        userId,
        sessionId: validProfileSnapshot.snapshotId,
        conversationId: counselorFixtureIds.conversationId,
        sourceEventId: counselorFixtureIds.userMessageId,
        content: "Synthetic safe message",
        occurredAt: "2026-07-28T09:00:00.000Z",
        profileSnapshotId: validProfileSnapshot.snapshotId,
        segment: validProfileSnapshot.segment,
        language: "en",
      }),
    ).resolves.toEqual(validSafetyDecision);
  });

  it.each(["disabled", "timed_out", "failed"] as const)(
    "supports the %s AI provider state",
    async (status) => {
      const result =
        status === "disabled" ? { status } : { status, errorCode: `synthetic_${status}` };
      const provider = new FixtureAiProvider(result);

      await expect(
        provider.generateDraft({
          conversationId: counselorFixtureIds.conversationId,
          userMessage: "Synthetic message",
          profile: validProfileSnapshot,
          recommendation: validRecommendationSet,
          groundingEvidence: [validRetrievedEvidence],
          recentMessages: [],
          groundingViolations: [],
        }),
      ).resolves.toEqual(result);
    },
  );

  it("renders private reports and share-safe cards separately", async () => {
    const renderer = new FixtureReportRenderer();

    await expect(renderer.renderPdf(validReportSnapshot)).resolves.toMatchObject({
      assetType: "report_pdf",
      privacyClass: "private_report",
    });
    await expect(renderer.renderShareCard(validReportSnapshot)).resolves.toMatchObject({
      assetType: "share_card",
      privacyClass: "share_safe",
    });
  });
});

describe("StartConversationService", () => {
  it("starts an AI-disabled conversation and persists approved welcome copy", async () => {
    const { repository, service } = createService();

    const result = await service.execute({
      userId,
      request: validStartConversationRequest,
    });

    expect(result).toMatchObject({
      conversation: {
        conversationId: counselorFixtureIds.conversationId,
        profileSnapshotId: validProfileSnapshot.snapshotId,
        aiMode: "disabled",
        status: "active",
      },
      journey: {
        currentStep: 1,
        currentStateKey: "synthetic_welcome",
        currentRecommendationId: validRecommendationSet.recommendationId,
      },
      welcomeTurn: {
        text: "Synthetic approved welcome.",
      },
    });
    await expect(
      repository.listMessages(userId, result.conversation.conversationId),
    ).resolves.toMatchObject([
      {
        role: "system_copy",
        content: "Synthetic approved welcome.",
        status: "completed",
      },
    ]);
  });

  it("returns the same result for retries and resumes the active conversation", async () => {
    const { repository, service } = createService();
    const first = await service.execute({
      userId,
      request: validStartConversationRequest,
    });
    const retry = await service.execute({
      userId,
      request: validStartConversationRequest,
    });
    const resume = await service.execute({
      userId,
      request: {
        ...validStartConversationRequest,
        idempotencyKey: secondIdempotencyKey,
      },
    });

    expect(retry).toEqual(first);
    expect(resume).toEqual(first);
    await expect(
      repository.listMessages(userId, first.conversation.conversationId),
    ).resolves.toHaveLength(1);
  });

  it("rejects a profile that belongs to another user", async () => {
    const { service } = createService(new InMemoryCounselorRepository(), {
      ...validProfileSnapshot,
      userId: "00000000-0000-4000-8000-000000000499",
    });

    await expect(
      service.execute({ userId, request: validStartConversationRequest }),
    ).rejects.toBeInstanceOf(CounselorNotFoundError);
  });

  it("enforces optimistic journey-state updates and event idempotency", async () => {
    const { repository, service } = createService();
    const started = await service.execute({
      userId,
      request: validStartConversationRequest,
    });
    const updatedJourney = {
      ...started.journey,
      currentStep: 2,
      currentStateKey: "synthetic_profile",
      lockVersion: 1,
    };

    await expect(
      repository.saveJourneyState(userId, updatedJourney, 0, secondIdempotencyKey),
    ).resolves.toEqual(updatedJourney);
    await expect(
      repository.saveJourneyState(
        userId,
        { ...updatedJourney, lockVersion: 2 },
        0,
        counselorFixtureIds.producerEventId,
      ),
    ).rejects.toThrow("optimistic lock conflict");

    const event = {
      eventId: journeyEventId,
      conversationId: started.conversation.conversationId,
      eventType: validCreateJourneyEventRequest.eventType,
      eventSchemaVersion: 1,
      relatedEntityType: null,
      relatedEntityId: validCreateJourneyEventRequest.relatedEntityId,
      metadata: null,
      occurredAt: "2026-07-28T09:05:00.000Z",
    };
    const firstEvent = await repository.recordJourneyEvent(
      userId,
      event,
      counselorFixtureIds.idempotencyKey,
    );
    const repeatedEvent = await repository.recordJourneyEvent(
      userId,
      { ...event, eventId: counselorFixtureIds.explorationEventId },
      counselorFixtureIds.idempotencyKey,
    );
    expect(repeatedEvent).toEqual(firstEvent);
  });
});
