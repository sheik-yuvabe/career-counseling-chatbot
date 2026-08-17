import { randomUUID } from "node:crypto";
import {
  CreateJourneyEventRequestSchema,
  CreateJourneyEventResponseSchema,
  UuidSchema,
  type CreateJourneyEventResponse,
} from "@yuvanext/contracts";
import type { CounselorRepository } from "./ports/index.js";

export type CreateJourneyEventCommand = {
  userId: string;
  request: unknown;
};

export type CreateJourneyEventDependencies = {
  repository: CounselorRepository;
  createId?: () => string;
  now?: () => Date;
};

export class CreateJourneyEventService {
  constructor(private readonly dependencies: CreateJourneyEventDependencies) {}

  async execute(command: CreateJourneyEventCommand): Promise<CreateJourneyEventResponse> {
    const userId = UuidSchema.parse(command.userId);
    const request = CreateJourneyEventRequestSchema.parse(command.request);
    const createId = this.dependencies.createId ?? randomUUID;
    const occurredAt = (this.dependencies.now ?? (() => new Date()))().toISOString();

    return CreateJourneyEventResponseSchema.parse(
      await this.dependencies.repository.applyJourneyEvent({
        userId,
        producerEventId: request.producerEventId,
        idempotencyKey: request.idempotencyKey,
        expectedLockVersion: request.expectedLockVersion,
        event: {
          eventId: createId(),
          conversationId: request.conversationId,
          eventType: request.eventType,
          eventSchemaVersion: request.eventSchemaVersion,
          relatedEntityType: request.relatedEntityType,
          relatedEntityId: request.relatedEntityId,
          metadata: request.metadata,
          occurredAt,
        },
      }),
    );
  }
}
