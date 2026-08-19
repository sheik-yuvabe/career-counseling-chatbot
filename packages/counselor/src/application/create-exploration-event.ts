import { randomUUID } from "node:crypto";
import {
  CreateExplorationEventRequestSchema,
  ExplorationEventResponseSchema,
  UuidSchema,
  type ExplorationEventResponse,
} from "@yuvanext/contracts";
import { CounselorContractError, CounselorNotFoundError } from "./errors.js";
import type { CounselorRepository, RecommendationReader } from "./ports/index.js";

export type CreateExplorationEventCommand = {
  userId: string;
  request: unknown;
};

export type CreateExplorationEventDependencies = {
  repository: CounselorRepository;
  recommendations: RecommendationReader;
  createId?: () => string;
  now?: () => Date;
};

export class CreateExplorationEventService {
  constructor(private readonly dependencies: CreateExplorationEventDependencies) {}

  async execute(command: CreateExplorationEventCommand): Promise<ExplorationEventResponse> {
    const userId = UuidSchema.parse(command.userId);
    const request = CreateExplorationEventRequestSchema.parse(command.request);

    if (request.conversationId) {
      const conversation = await this.dependencies.repository.findConversation(
        userId,
        request.conversationId,
      );
      if (!conversation) {
        throw new CounselorNotFoundError("Conversation was not found");
      }
    }

    const journey = await this.dependencies.repository.getJourneyState(userId);
    if (!journey?.profileSnapshotId) {
      throw new CounselorNotFoundError("Journey profile snapshot was not found");
    }
    const recommendation = await this.dependencies.recommendations.getRecommendationSet({
      userId,
      profileSnapshotId: journey.profileSnapshotId,
      recommendationId: request.recommendationId,
    });
    if (!recommendation || recommendation.recommendationId !== request.recommendationId) {
      throw new CounselorNotFoundError("Recommendation was not found");
    }
    if (
      request.recommendationItemId &&
      !recommendation.items.some((item) => item.itemId === request.recommendationItemId)
    ) {
      throw new CounselorContractError("Recommendation item does not belong to the recommendation");
    }

    const event = await this.dependencies.repository.recordExplorationEvent(userId, {
      ...request,
      eventId: (this.dependencies.createId ?? randomUUID)(),
      occurredAt: (this.dependencies.now ?? (() => new Date()))().toISOString(),
    });
    return ExplorationEventResponseSchema.parse({ event });
  }
}
