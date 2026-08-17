import {
  counselorFixtureIds,
  validAssistantTurn,
  validConversation,
  validJourneyState,
  validProfileSnapshot,
} from "@yuvanext/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  CounselorAccessError,
  GetConversationHistoryService,
  InMemoryCounselorRepository,
} from "../src/index.js";

const userId = validProfileSnapshot.userId;
const otherUserId = "00000000-0000-4000-8000-000000000499";

const createSeededService = async () => {
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
  await repository.appendMessage({
    userId,
    clientMessageId: null,
    idempotencyKey: "00000000-0000-4000-8000-000000000440",
    message: {
      messageId: "00000000-0000-4000-8000-000000000441",
      conversationId: validConversation.conversationId,
      turnNumber: 3,
      role: "assistant",
      content: "Synthetic third turn.",
      contentLanguage: "en",
      status: "completed",
      flags: [],
      createdAt: "2026-07-28T09:06:00.000Z",
    },
  });
  await repository.appendMessage({
    userId,
    clientMessageId: "00000000-0000-4000-8000-000000000442",
    idempotencyKey: "00000000-0000-4000-8000-000000000443",
    message: {
      messageId: "00000000-0000-4000-8000-000000000442",
      conversationId: validConversation.conversationId,
      turnNumber: 2,
      role: "user",
      content: "Synthetic second turn.",
      contentLanguage: "en",
      status: "received",
      flags: [],
      createdAt: "2026-07-28T09:05:00.000Z",
    },
  });
  return new GetConversationHistoryService(repository);
};

describe("GetConversationHistoryService", () => {
  it("returns owned messages in turn order", async () => {
    const service = await createSeededService();

    const history = await service.execute({
      userId,
      conversationId: validConversation.conversationId,
    });

    expect(history.messages.map((message) => message.turnNumber)).toEqual([1, 2, 3]);
  });

  it("does not disclose another user's conversation", async () => {
    const service = await createSeededService();

    await expect(
      service.execute({
        userId: otherUserId,
        conversationId: validConversation.conversationId,
      }),
    ).rejects.toBeInstanceOf(CounselorAccessError);
  });
});
