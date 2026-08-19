import {
  counselorFixtureIds,
  validAssistantTurn,
  validConversation,
  validJourneyState,
  validProfileSnapshot,
} from "@yuvanext/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  CounselorNotFoundError,
  GetJourneyService,
  InMemoryCounselorRepository,
} from "../src/index.js";

const userId = validProfileSnapshot.userId;

describe("GetJourneyService", () => {
  it("returns the authenticated user's resumable journey", async () => {
    const repository = new InMemoryCounselorRepository();
    await repository.saveStartResult({
      userId,
      idempotencyKey: counselorFixtureIds.idempotencyKey,
      response: {
        conversation: validConversation,
        journey: validJourneyState,
        welcomeTurn: validAssistantTurn,
      },
      welcomeMessage: {
        messageId: validAssistantTurn.turnId,
        conversationId: validConversation.conversationId,
        turnNumber: 1,
        role: "system_copy",
        content: validAssistantTurn.text,
        contentLanguage: "en",
        status: "completed",
        flags: [],
        createdAt: validAssistantTurn.createdAt,
      },
    });
    const service = new GetJourneyService(repository);

    await expect(service.execute({ userId })).resolves.toEqual({
      journey: validJourneyState,
    });
  });

  it("returns not found when the user has no journey", async () => {
    const service = new GetJourneyService(new InMemoryCounselorRepository());

    await expect(service.execute({ userId })).rejects.toBeInstanceOf(CounselorNotFoundError);
  });
});
