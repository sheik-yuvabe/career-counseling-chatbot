import type {
  Conversation,
  ConversationMessage,
  CounselorToolCall,
  CreateJourneyEventResponse,
  ExplorationEvent,
  GeneratedAsset,
  JourneyEvent,
  JourneyState,
  ReportSnapshot,
  StartConversationResponse,
} from "@yuvanext/contracts";
import {
  CounselorConflictError,
  CounselorNotFoundError,
  type ApplyJourneyEventInput,
  type AppendMessageInput,
  type CounselorRepository,
  type MessageGroundingRecord,
  type SaveReportInput,
  type SaveGeneratedAssetInput,
  type StoredStartResult,
} from "../../application/index.js";

type Owned<T> = { userId: string; value: T };

const key = (...parts: string[]): string => parts.join(":");
const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryCounselorRepository implements CounselorRepository {
  private readonly starts = new Map<string, StartConversationResponse>();
  private readonly activeStarts = new Map<string, StartConversationResponse>();
  private readonly conversations = new Map<string, Owned<Conversation>>();
  private readonly messages = new Map<string, ConversationMessage[]>();
  private readonly messageWrites = new Map<string, ConversationMessage>();
  private readonly clientMessageWrites = new Map<string, ConversationMessage>();
  private readonly journeys = new Map<string, JourneyState>();
  private readonly journeyWrites = new Map<string, JourneyState>();
  private readonly toolCalls = new Map<string, Owned<CounselorToolCall>>();
  private readonly messageGrounding = new Map<string, Owned<MessageGroundingRecord>>();
  private readonly events = new Map<string, JourneyEvent>();
  private readonly journeyEventWrites = new Map<string, CreateJourneyEventResponse>();
  private readonly explorationEvents = new Map<string, Owned<ExplorationEvent>>();
  private readonly reports = new Map<string, Owned<ReportSnapshot>>();
  private readonly reportWrites = new Map<string, ReportSnapshot>();
  private readonly generatedAssets = new Map<string, GeneratedAsset>();

  findStartResult(
    userId: string,
    idempotencyKey: string,
  ): Promise<StartConversationResponse | null> {
    return Promise.resolve(this.copyOrNull(this.starts.get(key(userId, idempotencyKey))));
  }

  findActiveStartResult(userId: string): Promise<StartConversationResponse | null> {
    return Promise.resolve(this.copyOrNull(this.activeStarts.get(userId)));
  }

  saveStartResult(input: StoredStartResult): Promise<StartConversationResponse> {
    const writeKey = key(input.userId, input.idempotencyKey);
    const existing = this.starts.get(writeKey);
    if (existing) {
      return Promise.resolve(clone(existing));
    }

    const response = clone(input.response);
    const conversationId = response.conversation.conversationId;
    this.starts.set(writeKey, response);
    this.activeStarts.set(input.userId, response);
    this.conversations.set(conversationId, {
      userId: input.userId,
      value: response.conversation,
    });
    this.journeys.set(input.userId, response.journey);

    const messages = this.messages.get(conversationId) ?? [];
    if (!messages.some((message) => message.messageId === input.welcomeMessage.messageId)) {
      messages.push(clone(input.welcomeMessage));
      this.messages.set(conversationId, messages);
    }

    return Promise.resolve(clone(response));
  }

  findConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    const owned = this.conversations.get(conversationId);
    return Promise.resolve(owned?.userId === userId ? clone(owned.value) : null);
  }

  listMessages(userId: string, conversationId: string): Promise<ConversationMessage[]> {
    return this.execute(() => {
      this.assertConversationOwner(userId, conversationId);
      return clone(this.messages.get(conversationId) ?? []);
    });
  }

  appendMessage(input: AppendMessageInput): Promise<ConversationMessage> {
    return this.execute(() => {
      this.assertConversationOwner(input.userId, input.message.conversationId);
      const writeKey = key(input.userId, input.idempotencyKey);
      const existing = this.messageWrites.get(writeKey);
      if (existing) {
        return clone(existing);
      }
      const clientWriteKey = input.clientMessageId
        ? key(input.message.conversationId, input.clientMessageId)
        : null;
      const existingClientMessage = clientWriteKey
        ? this.clientMessageWrites.get(clientWriteKey)
        : undefined;
      if (existingClientMessage) {
        return clone(existingClientMessage);
      }

      const stored = clone(input.message);
      const messages = this.messages.get(input.message.conversationId) ?? [];
      messages.push(stored);
      this.messages.set(input.message.conversationId, messages);
      this.messageWrites.set(writeKey, stored);
      if (clientWriteKey) {
        this.clientMessageWrites.set(clientWriteKey, stored);
      }
      return clone(stored);
    });
  }

  getJourneyState(userId: string): Promise<JourneyState | null> {
    return Promise.resolve(this.copyOrNull(this.journeys.get(userId)));
  }

  saveJourneyState(
    userId: string,
    journey: JourneyState,
    expectedLockVersion: number,
    idempotencyKey: string,
  ): Promise<JourneyState> {
    return this.execute(() => {
      const writeKey = key(userId, idempotencyKey);
      const priorWrite = this.journeyWrites.get(writeKey);
      if (priorWrite) {
        return clone(priorWrite);
      }

      const current = this.journeys.get(userId);
      if (!current || current.lockVersion !== expectedLockVersion) {
        throw new Error("Journey state optimistic lock conflict");
      }
      if (journey.lockVersion !== expectedLockVersion + 1) {
        throw new Error("Journey state lock version must increment by one");
      }

      const stored = clone(journey);
      this.journeys.set(userId, stored);
      this.journeyWrites.set(writeKey, stored);
      return clone(stored);
    });
  }

  applyJourneyEvent(input: ApplyJourneyEventInput): Promise<CreateJourneyEventResponse> {
    return this.execute(() => {
      const idempotencyWriteKey = key(input.userId, input.idempotencyKey);
      const producerWriteKey = key(input.userId, input.producerEventId);
      const existing =
        this.journeyEventWrites.get(idempotencyWriteKey) ??
        this.journeyEventWrites.get(producerWriteKey);
      if (existing) {
        return clone(existing);
      }

      const current = this.journeys.get(input.userId);
      if (!current) {
        throw new CounselorNotFoundError("Journey state was not found");
      }
      if (current.lockVersion !== input.expectedLockVersion) {
        throw new CounselorConflictError("Journey state optimistic lock conflict");
      }
      if (input.event.conversationId) {
        this.assertConversationOwner(input.userId, input.event.conversationId);
      }

      const journey = {
        ...current,
        lockVersion: current.lockVersion + 1,
        updatedAt: input.event.occurredAt,
      };
      const result = {
        event: clone(input.event),
        journey: clone(journey),
      };
      this.journeys.set(input.userId, journey);
      this.events.set(producerWriteKey, result.event);
      this.journeyEventWrites.set(idempotencyWriteKey, result);
      this.journeyEventWrites.set(producerWriteKey, result);
      return clone(result);
    });
  }

  recordToolCall(userId: string, toolCall: CounselorToolCall): Promise<CounselorToolCall> {
    return this.execute(() => {
      this.assertConversationOwner(userId, toolCall.conversationId);
      const existing = this.toolCalls.get(toolCall.toolCallId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new Error("Tool call access denied");
        }
        return clone(existing.value);
      }

      const stored = clone(toolCall);
      this.toolCalls.set(toolCall.toolCallId, { userId, value: stored });
      return clone(stored);
    });
  }

  recordMessageGrounding(userId: string, records: MessageGroundingRecord[]): Promise<void> {
    return this.execute(() => {
      for (const record of records) {
        this.assertConversationOwner(
          userId,
          this.toolCalls.get(record.toolCallId)?.value.conversationId ?? "",
        );
        const existing = this.messageGrounding.get(record.groundingId);
        if (existing && existing.userId !== userId) {
          throw new Error("Message grounding access denied");
        }
        this.messageGrounding.set(record.groundingId, {
          userId,
          value: clone(record),
        });
      }
    });
  }

  recordJourneyEvent(
    userId: string,
    event: JourneyEvent,
    producerEventId: string,
  ): Promise<JourneyEvent> {
    return this.execute(() => {
      const writeKey = key(userId, producerEventId);
      const existing = this.events.get(writeKey);
      if (existing) {
        return clone(existing);
      }
      if (event.conversationId) {
        this.assertConversationOwner(userId, event.conversationId);
      }

      const stored = clone(event);
      this.events.set(writeKey, stored);
      return clone(stored);
    });
  }

  recordExplorationEvent(userId: string, event: ExplorationEvent): Promise<ExplorationEvent> {
    return this.execute(() => {
      const existing = this.explorationEvents.get(event.clientEventId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new Error("Exploration event access denied");
        }
        return clone(existing.value);
      }
      if (event.conversationId) {
        this.assertConversationOwner(userId, event.conversationId);
      }

      const stored = clone(event);
      this.explorationEvents.set(event.clientEventId, {
        userId,
        value: stored,
      });
      return clone(stored);
    });
  }

  listExplorationEvents(userId: string, eventIds: string[]): Promise<ExplorationEvent[]> {
    const wanted = new Set(eventIds);
    return Promise.resolve(
      [...this.explorationEvents.values()]
        .filter((owned) => owned.userId === userId && wanted.has(owned.value.eventId))
        .map((owned) => clone(owned.value)),
    );
  }

  findReport(userId: string, reportId: string): Promise<ReportSnapshot | null> {
    const owned = this.reports.get(reportId);
    return Promise.resolve(owned?.userId === userId ? clone(owned.value) : null);
  }

  saveReport(input: SaveReportInput): Promise<ReportSnapshot> {
    const writeKey = key(input.userId, input.idempotencyKey);
    const existing = this.reportWrites.get(writeKey);
    if (existing) {
      return Promise.resolve(clone(existing));
    }

    const stored = clone(input.report);
    this.reports.set(input.report.reportId, {
      userId: input.userId,
      value: stored,
    });
    this.reportWrites.set(writeKey, stored);
    return Promise.resolve(clone(stored));
  }

  saveGeneratedAsset(input: SaveGeneratedAssetInput): Promise<GeneratedAsset> {
    const writeKey = key(input.userId, input.idempotencyKey);
    const existing = this.generatedAssets.get(writeKey);
    if (existing) {
      return Promise.resolve(clone(existing));
    }
    const stored = clone(input.asset);
    this.generatedAssets.set(writeKey, stored);
    return Promise.resolve(clone(stored));
  }

  findGeneratedAsset(userId: string, idempotencyKey: string): Promise<GeneratedAsset | null> {
    return Promise.resolve(this.copyOrNull(this.generatedAssets.get(key(userId, idempotencyKey))));
  }

  private assertConversationOwner(userId: string, conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation access denied");
    }
  }

  private execute<T>(operation: () => T): Promise<T> {
    return Promise.resolve().then(operation);
  }

  private copyOrNull<T>(value: T | undefined): T | null {
    return value === undefined ? null : clone(value);
  }
}
