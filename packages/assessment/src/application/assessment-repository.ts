import type {
  AssessmentItem,
  AssessmentResponse,
  AssessmentResult,
  AssessmentRun,
  InstrumentCode,
  ProfileSnapshot,
  Segment,
  UserProfile,
} from "@yuvanext/contracts";
import type { ScoredResponseInput } from "../domain/scoring.js";

export type AssessmentVersionRecord = {
  id: string;
  instrumentCode: InstrumentCode;
  instrumentVersion: string;
  algorithmVersion: string;
  batchSize: number;
  itemCount: number;
};

export type NewAssessmentRun = {
  id: string;
  userId: string;
  journeySessionId: string;
  assessmentVersionId: string;
  segment: Segment;
  status: "active";
  currentPosition: number;
  startedAt: string;
  resumeExpiresAt: string;
  attemptNumber: number;
  createdAt: string;
};

export type NewAssessmentResponse = {
  id: string;
  assessmentRunId: string;
  itemId: string;
  selectedOptionId: string | null;
  responseValue: number | null;
  responseJson: unknown;
  latencyMs: number | null;
  answeredAt: string;
  receivedAt: string;
};

export type NewProfileSnapshot = {
  id: string;
  userId: string;
  profileVersion: number;
  profile: UserProfile;
  intakeSummary: Record<string, unknown>;
  resultSummary: Record<string, unknown>;
  algorithmVersion: string;
  snapshotSchemaVersion: number;
  payloadHash: string;
  sourceResults: Array<{ resultId: string; role: "interest" | "values"; displayOrder: number }>;
  createdAt: string;
};

export type AssessmentRepository = {
  findActiveVersion(input: {
    instrumentCode: InstrumentCode;
    language: string;
    ageAtOnboarding: number;
    now: string;
  }): Promise<AssessmentVersionRecord | null>;
  createRun(input: NewAssessmentRun): Promise<AssessmentRun>;
  findRunByIdForUser(input: { runId: string; userId: string }): Promise<AssessmentRun | null>;
  listRunItems(runId: string): Promise<AssessmentItem[]>;
  listAnsweredItemIds(runId: string): Promise<Set<string>>;
  findItemForRun(input: { runId: string; itemId: string }): Promise<AssessmentItem | null>;
  findOptionForItem(input: { itemId: string; optionId: string }): Promise<{ id: string; scoreDelta: number | null } | null>;
  upsertResponse(input: NewAssessmentResponse): Promise<AssessmentResponse>;
  updateRunProgress(input: {
    runId: string;
    currentPosition: number;
    status: "active" | "completed";
    now: string;
  }): Promise<AssessmentRun>;
  listScoringResponses(runId: string): Promise<ScoredResponseInput[]>;
  createResult(input: AssessmentResult): Promise<AssessmentResult>;
  findResultByRunForUser(input: { runId: string; userId: string }): Promise<AssessmentResult | null>;
  findLatestResultByUserForInstrument(input: {
    userId: string;
    instrumentCode: InstrumentCode;
  }): Promise<AssessmentResult | null>;
  getIntakeSummary(input: { userId: string; sessionId: string }): Promise<Record<string, unknown>>;
  getNextProfileVersion(userId: string): Promise<number>;
  createProfileSnapshot(input: NewProfileSnapshot): Promise<ProfileSnapshot>;
};
