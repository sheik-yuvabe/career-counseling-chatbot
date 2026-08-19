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
    const journey = await this.dependencies.repository.getJourneyState(userId);

    return CreateJourneyEventResponseSchema.parse(
      await this.dependencies.repository.applyJourneyEvent({
        userId,
        producerEventId: request.idempotencyKey,
        idempotencyKey: request.idempotencyKey,
        expectedLockVersion: journey?.lockVersion ?? 0,
        event: {
          eventId: createId(),
          conversationId: journey?.conversationId ?? null,
          eventType: request.eventType,
          eventSchemaVersion: 1,
          relatedEntityType: null,
          relatedEntityId: request.relatedEntityId ?? null,
          metadata: null,
          occurredAt,
        },
      }),
    );
  }
}
