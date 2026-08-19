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

export type StoredStartResult = {
  userId: string;
  idempotencyKey: string;
  response: StartConversationResponse;
  welcomeMessage: ConversationMessage;
};

export type SaveReportInput = {
  userId: string;
  report: ReportSnapshot;
  explorationEventIds: string[];
  idempotencyKey: string;
};

export type AppendMessageInput = {
  userId: string;
  message: ConversationMessage;
  clientMessageId: string | null;
  idempotencyKey: string;
};

export type ApplyJourneyEventInput = {
  userId: string;
  event: JourneyEvent;
  producerEventId: string;
  idempotencyKey: string;
  expectedLockVersion: number;
};

export type SaveGeneratedAssetInput = {
  userId: string;
  idempotencyKey: string;
  asset: GeneratedAsset;
};

export type MessageGroundingRecord = {
  groundingId: string;
  assistantMessageId: string;
  toolCallId: string;
  entityType: string;
  entityId: string;
  displayName: string;
  allowedNumbers: Record<string, number>;
  allowedUrls: string[];
  sourceVersion: string;
};

export interface CounselorRepository {
  findStartResult(
    userId: string,
    idempotencyKey: string,
  ): Promise<StartConversationResponse | null>;
  findActiveStartResult(userId: string): Promise<StartConversationResponse | null>;
  saveStartResult(input: StoredStartResult): Promise<StartConversationResponse>;
  findConversation(userId: string, conversationId: string): Promise<Conversation | null>;
  listMessages(userId: string, conversationId: string): Promise<ConversationMessage[]>;
  appendMessage(input: AppendMessageInput): Promise<ConversationMessage>;
  getJourneyState(userId: string): Promise<JourneyState | null>;
  saveJourneyState(
    userId: string,
    journey: JourneyState,
    expectedLockVersion: number,
    idempotencyKey: string,
  ): Promise<JourneyState>;
  recordToolCall(userId: string, toolCall: CounselorToolCall): Promise<CounselorToolCall>;
  recordMessageGrounding(userId: string, records: MessageGroundingRecord[]): Promise<void>;
  recordJourneyEvent(
    userId: string,
    event: JourneyEvent,
    producerEventId: string,
  ): Promise<JourneyEvent>;
  applyJourneyEvent(input: ApplyJourneyEventInput): Promise<CreateJourneyEventResponse>;
  recordExplorationEvent(userId: string, event: ExplorationEvent): Promise<ExplorationEvent>;
  listExplorationEvents(userId: string, eventIds: string[]): Promise<ExplorationEvent[]>;
  listExplorationEventsForRecommendation(
    userId: string,
    recommendationId: string,
  ): Promise<ExplorationEvent[]>;
  findReport(userId: string, reportId: string): Promise<ReportSnapshot | null>;
  saveReport(input: SaveReportInput): Promise<ReportSnapshot>;
  findGeneratedAsset(userId: string, idempotencyKey: string): Promise<GeneratedAsset | null>;
  saveGeneratedAsset(input: SaveGeneratedAssetInput): Promise<GeneratedAsset>;
}
