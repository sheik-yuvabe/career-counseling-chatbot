import {
  ConversationHistoryResponseSchema,
  UuidSchema,
  type ConversationHistoryResponse,
} from "@yuvanext/contracts";
import { CounselorAccessError } from "./errors.js";
import type { CounselorRepository } from "./ports/index.js";

export type GetConversationHistoryCommand = {
  userId: string;
  conversationId: string;
};

export class GetConversationHistoryService {
  constructor(private readonly repository: CounselorRepository) {}

  async execute(command: GetConversationHistoryCommand): Promise<ConversationHistoryResponse> {
    const userId = UuidSchema.parse(command.userId);
    const conversationId = UuidSchema.parse(command.conversationId);
    const conversation = await this.repository.findConversation(userId, conversationId);
    if (!conversation) {
      throw new CounselorAccessError("Conversation access denied");
    }

    const messages = await this.repository.listMessages(userId, conversationId);
    return ConversationHistoryResponseSchema.parse({
      conversation,
      messages: [...messages].sort((left, right) => left.turnNumber - right.turnNumber),
    });
  }
}
