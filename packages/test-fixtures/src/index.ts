import type {
  AssistantTurn,
  Conversation,
  CatalogEntity,
  CounselorToolCall,
  CreateJourneyEventRequest,
  CreateReportRequest,
  ExplorationEvent,
  HandoffPacket,
  JourneyState,
  ProfileSnapshot,
  RecommendationSet,
  ReportSnapshot,
  RetrievedEvidence,
  SafetyDecision,
  SendConversationMessageRequest,
  StartConversationRequest,
  WidgetDirective,
} from "@yuvanext/contracts";

// Export only synthetic, versioned fixtures. Real user data is forbidden here.
export const FIXTURE_SCHEMA_VERSION = 1 as const;

export const counselorFixtureIds = {
  conversationId: "00000000-0000-4000-8000-000000000401",
  userMessageId: "00000000-0000-4000-8000-000000000402",
  assistantTurnId: "00000000-0000-4000-8000-000000000403",
  toolCallId: "00000000-0000-4000-8000-000000000404",
  widgetId: "00000000-0000-4000-8000-000000000405",
  profileSnapshotId: "00000000-0000-4000-8000-000000000406",
  recommendationId: "00000000-0000-4000-8000-000000000407",
  entityId: "00000000-0000-4000-8000-000000000408",
  reportId: "00000000-0000-4000-8000-000000000409",
  explorationEventId: "00000000-0000-4000-8000-000000000410",
  producerEventId: "00000000-0000-4000-8000-000000000411",
  idempotencyKey: "00000000-0000-4000-8000-000000000412",
  recommendationItemId: "00000000-0000-4000-8000-000000000413",
  safetyDecisionId: "00000000-0000-4000-8000-000000000414",
  handoffId: "00000000-0000-4000-8000-000000000415",
  assessmentResultId: "00000000-0000-4000-8000-000000000416",
  clientExplorationEventId: "00000000-0000-4000-8000-000000000419",
} as const;

export const validProfileSnapshot = {
  snapshotId: counselorFixtureIds.profileSnapshotId,
  userId: "00000000-0000-4000-8000-000000000400",
  segment: "pathfinder",
  ageBand: "16-18",
  city: "Synthetic City",
  state: "Synthetic State",
  selfStage: "exploring",
  wantsAid: true,
  intakeSummary: { preferredLearningMode: "practical" },
  riasec: {
    rawScores: { R: 3, I: 5, A: 2, S: 4, E: 1, C: 3 },
    normalizedScores: { R: 60, I: 100, A: 40, S: 80, E: 20, C: 60 },
    code: "ISR",
    confidence: "normal",
    closeScores: false,
    instrumentCode: "synthetic-riasec",
    instrumentVersion: "1",
  },
  profileVersion: FIXTURE_SCHEMA_VERSION,
  algorithmVersion: "synthetic-profile-v1",
  sourceResultIds: [counselorFixtureIds.assessmentResultId],
  createdAt: "2026-07-28T08:00:00.000Z",
} satisfies ProfileSnapshot;

export const validRecommendationSet = {
  recommendationId: counselorFixtureIds.recommendationId,
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  kind: "career",
  items: [
    {
      itemId: counselorFixtureIds.recommendationItemId,
      entityType: "career",
      entityId: counselorFixtureIds.entityId,
      rank: 1,
      fitScore: 91,
      ring: "inner",
      explanation: { reasonKey: "synthetic_interest_alignment" },
    },
  ],
  algorithmVersion: "synthetic-ranking-v1",
  weightsVersion: "synthetic-weights-v1",
  sourceDataVersions: { knowledge: "synthetic-catalog-v1" },
  inputHash: "sha256:synthetic-recommendation-input",
  outputHash: "sha256:synthetic-recommendation-output",
  createdAt: "2026-07-28T08:30:00.000Z",
} satisfies RecommendationSet;

export const validCatalogEntity = {
  id: counselorFixtureIds.entityId,
  entityType: "career",
  title: "Synthetic Data Analyst",
  status: "published",
  datasetVersion: "synthetic-catalog-v1",
  sourceRefs: ["synthetic-source"],
  lastVerifiedAt: "2026-07-27T08:00:00.000Z",
} satisfies CatalogEntity;

export const validRetrievedEvidence = {
  queryType: "career_by_id",
  entities: [validCatalogEntity],
  sourceVersions: { knowledge: "synthetic-catalog-v1" },
  retrievedAt: "2026-07-28T08:45:00.000Z",
} satisfies RetrievedEvidence;

export const validSafetyDecision = {
  decisionId: counselorFixtureIds.safetyDecisionId,
  triggered: false,
  pauseJourney: false,
  createHandoff: false,
} satisfies SafetyDecision;

export const validHandoffPacket = {
  handoffId: counselorFixtureIds.handoffId,
  user: {
    firstName: "Synthetic",
    ageBand: validProfileSnapshot.ageBand,
    segment: validProfileSnapshot.segment,
  },
  profile: {
    profileSnapshotId: validProfileSnapshot.snapshotId,
    code: validProfileSnapshot.riasec.code,
    confidence: validProfileSnapshot.riasec.confidence,
  },
  trigger: {
    reason: "tier_2",
    excerpt: "Synthetic safety excerpt",
    occurredAt: "2026-07-28T09:00:00.000Z",
  },
  lastTurns: [{ role: "user", content: "Synthetic safety excerpt" }],
  planState: { currentStep: 2 },
  consentedContactAvailable: true,
  status: "queued",
} satisfies HandoffPacket;

export const validStartConversationRequest = {
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  idempotencyKey: counselorFixtureIds.idempotencyKey,
} satisfies StartConversationRequest;

export const validConversation = {
  conversationId: counselorFixtureIds.conversationId,
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  segment: "pathfinder",
  status: "active",
  channel: "web",
  language: "en",
  aiMode: "disabled",
  startedAt: "2026-07-28T09:00:00.000Z",
  lastTurnAt: null,
  completedAt: null,
} satisfies Conversation;

export const validSendConversationMessageRequest = {
  content: "Please explain my top career recommendation.",
  idempotencyKey: counselorFixtureIds.idempotencyKey,
} satisfies SendConversationMessageRequest;

export const validCareerWidget = {
  widgetId: counselorFixtureIds.widgetId,
  widgetType: "career_detail",
  schemaVersion: FIXTURE_SCHEMA_VERSION,
  entityIds: [counselorFixtureIds.entityId],
  recommendationIds: [counselorFixtureIds.recommendationId],
  payload: {
    entityId: counselorFixtureIds.entityId,
    displayName: "Synthetic Data Analyst",
  },
} satisfies WidgetDirective;

export const validCounselorToolCall = {
  toolCallId: counselorFixtureIds.toolCallId,
  conversationId: counselorFixtureIds.conversationId,
  requestMessageId: counselorFixtureIds.assistantTurnId,
  toolName: "get_career",
  toolSchemaVersion: "1",
  input: { entityId: counselorFixtureIds.entityId },
  inputHash: "sha256:synthetic-input",
  outputSnapshot: {
    entityId: counselorFixtureIds.entityId,
    displayName: "Synthetic Data Analyst",
  },
  outputHash: "sha256:synthetic-output",
  sourceVersions: { knowledge: "synthetic-catalog-v1" },
  status: "succeeded",
  latencyMs: 12,
  errorCode: null,
  startedAt: "2026-07-28T09:01:00.000Z",
  completedAt: "2026-07-28T09:01:00.012Z",
} satisfies CounselorToolCall;

export const validAssistantTurn = {
  turnId: counselorFixtureIds.assistantTurnId,
  conversationId: counselorFixtureIds.conversationId,
  text: "Your recommendation includes Synthetic Data Analyst.",
  widgets: [validCareerWidget],
  grounding: {
    toolCallIds: [counselorFixtureIds.toolCallId],
    entityIds: [counselorFixtureIds.entityId],
    recommendationIds: [counselorFixtureIds.recommendationId],
  },
  flags: [],
  createdAt: "2026-07-28T09:01:01.000Z",
} satisfies AssistantTurn;

export const validJourneyState = {
  conversationId: counselorFixtureIds.conversationId,
  currentStep: 3,
  currentStateKey: "guidance",
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  currentRecommendationId: counselorFixtureIds.recommendationId,
  currentAssessmentRunId: null,
  isSafetyPaused: false,
  state: { selectedEntityId: counselorFixtureIds.entityId },
  lockVersion: 2,
  updatedAt: "2026-07-28T09:02:00.000Z",
} satisfies JourneyState;

export const validCreateJourneyEventRequest = {
  conversationId: counselorFixtureIds.conversationId,
  eventType: "career_opened",
  eventSchemaVersion: FIXTURE_SCHEMA_VERSION,
  relatedEntityType: "career",
  relatedEntityId: counselorFixtureIds.entityId,
  metadata: { source: "assistant_turn" },
  producerEventId: counselorFixtureIds.producerEventId,
  idempotencyKey: counselorFixtureIds.idempotencyKey,
  expectedLockVersion: 2,
} satisfies CreateJourneyEventRequest;

export const validExplorationEvent = {
  eventId: counselorFixtureIds.explorationEventId,
  conversationId: counselorFixtureIds.conversationId,
  recommendationId: counselorFixtureIds.recommendationId,
  recommendationItemId: counselorFixtureIds.recommendationItemId,
  action: "viewed",
  occurredAt: "2026-07-28T09:02:30.000Z",
  clientEventId: counselorFixtureIds.clientExplorationEventId,
} satisfies ExplorationEvent;

export const validCreateReportRequest = {
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  recommendationIds: [counselorFixtureIds.recommendationId],
  explorationEventIds: [counselorFixtureIds.explorationEventId],
  language: "en",
  idempotencyKey: counselorFixtureIds.idempotencyKey,
} satisfies CreateReportRequest;

export const validReportSnapshot = {
  reportId: counselorFixtureIds.reportId,
  profileSnapshotId: counselorFixtureIds.profileSnapshotId,
  recommendationIds: [counselorFixtureIds.recommendationId],
  exploredEntityIds: [counselorFixtureIds.entityId],
  reportSchemaVersion: FIXTURE_SCHEMA_VERSION,
  language: "en",
  payload: {
    profileSnapshotId: counselorFixtureIds.profileSnapshotId,
    recommendationIds: [counselorFixtureIds.recommendationId],
  },
  payloadHash: "sha256:synthetic-report",
  summaryMode: "template",
  promptVersion: null,
  createdAt: "2026-07-28T09:03:00.000Z",
} satisfies ReportSnapshot;

export const invalidCounselorFixtures = {
  clientSuppliedConversationContext: {
    ...validStartConversationRequest,
    segment: "pathfinder",
    channel: "web",
    language: "ta",
  },
  unknownTool: {
    ...validCounselorToolCall,
    toolName: "search_internet",
  },
  journeyStepOutsidePhaseA: {
    ...validJourneyState,
    currentStep: 6,
  },
  reportWithoutRecommendations: {
    ...validReportSnapshot,
    recommendationIds: [],
  },
} as const;
