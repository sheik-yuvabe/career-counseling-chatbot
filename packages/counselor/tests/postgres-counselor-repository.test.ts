import { readFile } from "node:fs/promises";
import {
  counselorFixtureIds,
  validCreateJourneyEventRequest,
  validAssistantTurn,
  validConversation,
  validJourneyState,
  validStartConversationRequest,
} from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import {
  CounselorAccessError,
  CounselorConflictError,
  PostgresCounselorRepository,
} from "../src/index.js";

type RepositoryPool = ConstructorParameters<typeof PostgresCounselorRepository>[0];

const messageRow = {
  client_message_id: counselorFixtureIds.userMessageId,
  id: counselorFixtureIds.userMessageId,
  conversation_id: counselorFixtureIds.conversationId,
  idempotency_key: counselorFixtureIds.idempotencyKey,
  turn_number: 2,
  role: "user",
  content: "Synthetic user message",
  content_language: "en",
  message_status: "received",
  provider_message_id_hash: null,
  prompt_version: null,
  model_name: null,
  flags: [],
  created_at: "2026-07-28T09:05:00.000Z",
};

const message = {
  messageId: messageRow.id,
  conversationId: messageRow.conversation_id,
  turnNumber: messageRow.turn_number,
  role: "user" as const,
  content: messageRow.content,
  contentLanguage: "en" as const,
  status: "received" as const,
  flags: [],
  createdAt: messageRow.created_at,
};

const journeyRow = {
  user_id: "00000000-0000-4000-8000-000000000400",
  conversation_id: validJourneyState.conversationId,
  current_step: validJourneyState.currentStep,
  current_state_key: validJourneyState.currentStateKey,
  profile_snapshot_id: validJourneyState.profileSnapshotId,
  current_recommendation_id: validJourneyState.currentRecommendationId,
  current_assessment_run_id: validJourneyState.currentAssessmentRunId,
  is_safety_paused: validJourneyState.isSafetyPaused,
  state_json: validJourneyState.state,
  lock_version: validJourneyState.lockVersion,
  last_idempotency_key: null,
  updated_at: validJourneyState.updatedAt,
};

const createQueryPool = (
  rows: unknown[] = [],
): {
  pool: RepositoryPool;
  query: ReturnType<typeof vi.fn>;
} => {
  const query = vi.fn((sql: string, parameters?: readonly unknown[]) => {
    void sql;
    void parameters;
    return Promise.resolve({ rows });
  });
  return {
    pool: { query } as unknown as RepositoryPool,
    query,
  };
};

describe("PostgresCounselorRepository", () => {
  it("scopes conversation reads to the authenticated user", async () => {
    const { pool, query } = createQueryPool();
    const repository = new PostgresCounselorRepository(pool);

    await expect(
      repository.findConversation(
        validAssistantTurn.conversationId,
        validConversation.conversationId,
      ),
    ).resolves.toBeNull();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("id = $1 and user_id = $2"), [
      validConversation.conversationId,
      validAssistantTurn.conversationId,
    ]);
  });

  it("returns the stored message for a duplicate idempotency key", async () => {
    const { pool, query } = createQueryPool([messageRow]);
    const repository = new PostgresCounselorRepository(pool);

    await expect(
      repository.appendMessage({
        userId: "00000000-0000-4000-8000-000000000400",
        message,
        clientMessageId: counselorFixtureIds.userMessageId,
        idempotencyKey: counselorFixtureIds.idempotencyKey,
      }),
    ).resolves.toEqual(message);

    expect(String(query.mock.calls[0]?.[0])).toContain("on conflict do nothing");
    expect(String(query.mock.calls[0]?.[0])).toContain("m.client_message_id = $4");
  });

  it("rejects a message write when conversation ownership is absent", async () => {
    const { pool } = createQueryPool();
    const repository = new PostgresCounselorRepository(pool);

    await expect(
      repository.appendMessage({
        userId: "00000000-0000-4000-8000-000000000499",
        message,
        clientMessageId: counselorFixtureIds.userMessageId,
        idempotencyKey: counselorFixtureIds.idempotencyKey,
      }),
    ).rejects.toBeInstanceOf(CounselorAccessError);
  });

  it("detects an optimistic journey-state conflict", async () => {
    const { pool } = createQueryPool();
    const repository = new PostgresCounselorRepository(pool);

    await expect(
      repository.saveJourneyState(
        "00000000-0000-4000-8000-000000000400",
        { ...validJourneyState, lockVersion: 3 },
        1,
        counselorFixtureIds.idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(CounselorConflictError);
  });

  it("applies a journey event and lock-version increment in one transaction", async () => {
    const updatedJourneyRow = {
      ...journeyRow,
      lock_version: validJourneyState.lockVersion + 1,
      last_idempotency_key: validCreateJourneyEventRequest.idempotencyKey,
      updated_at: "2026-07-28T09:07:00.000Z",
    };
    const eventRow = {
      id: "00000000-0000-4000-8000-000000000480",
      user_id: journeyRow.user_id,
      producer_event_id: validCreateJourneyEventRequest.producerEventId,
      conversation_id: validCreateJourneyEventRequest.conversationId,
      event_type: validCreateJourneyEventRequest.eventType,
      event_schema_version: validCreateJourneyEventRequest.eventSchemaVersion,
      related_entity_type: validCreateJourneyEventRequest.relatedEntityType,
      related_entity_id: validCreateJourneyEventRequest.relatedEntityId,
      metadata_json: validCreateJourneyEventRequest.metadata,
      occurred_at: "2026-07-28T09:07:00.000Z",
    };
    const clientQuery = vi.fn((sql: string) => {
      if (sql.includes("select * from counselor.journey_events")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("for update")) {
        return Promise.resolve({ rows: [journeyRow] });
      }
      if (sql.includes("update counselor.journey_states")) {
        return Promise.resolve({ rows: [updatedJourneyRow] });
      }
      if (sql.includes("insert into counselor.journey_events")) {
        return Promise.resolve({ rows: [eventRow] });
      }
      return Promise.resolve({ rows: [] });
    });
    const release = vi.fn();
    const pool = {
      connect: vi.fn(() => Promise.resolve({ query: clientQuery, release })),
    } as unknown as RepositoryPool;
    const repository = new PostgresCounselorRepository(pool);

    const result = await repository.applyJourneyEvent({
      userId: journeyRow.user_id,
      producerEventId: validCreateJourneyEventRequest.producerEventId,
      idempotencyKey: validCreateJourneyEventRequest.idempotencyKey,
      expectedLockVersion: validJourneyState.lockVersion,
      event: {
        eventId: eventRow.id,
        conversationId: eventRow.conversation_id,
        eventType: eventRow.event_type,
        eventSchemaVersion: eventRow.event_schema_version,
        relatedEntityType: eventRow.related_entity_type,
        relatedEntityId: eventRow.related_entity_id,
        metadata: eventRow.metadata_json,
        occurredAt: eventRow.occurred_at,
      },
    });

    expect(result.journey.lockVersion).toBe(validJourneyState.lockVersion + 1);
    expect(result.event.eventId).toBe(eventRow.id);
    expect(clientQuery).toHaveBeenCalledWith("begin");
    expect(clientQuery).toHaveBeenCalledWith("commit");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back an incomplete conversation initialization", async () => {
    const clientQuery = vi.fn((sql: string) => {
      if (sql.includes("insert into counselor.conversation_messages")) {
        return Promise.reject(new Error("synthetic message insert failure"));
      }
      return Promise.resolve({ rows: [] });
    });
    const release = vi.fn();
    const pool = {
      connect: vi.fn(() =>
        Promise.resolve({
          query: clientQuery,
          release,
        }),
      ),
    } as unknown as RepositoryPool;
    const repository = new PostgresCounselorRepository(pool);

    await expect(
      repository.saveStartResult({
        userId: "00000000-0000-4000-8000-000000000400",
        idempotencyKey: validStartConversationRequest.idempotencyKey,
        response: {
          conversation: validConversation,
          journey: validJourneyState,
          welcomeTurn: validAssistantTurn,
        },
        welcomeMessage: {
          messageId: validAssistantTurn.turnId,
          conversationId: validAssistantTurn.conversationId,
          turnNumber: 1,
          role: "system_copy",
          content: validAssistantTurn.text,
          contentLanguage: "en",
          status: "completed",
          flags: [],
          createdAt: validAssistantTurn.createdAt,
        },
      }),
    ).rejects.toThrow("synthetic message insert failure");

    expect(clientQuery).toHaveBeenCalledWith("rollback");
    expect(release).toHaveBeenCalledOnce();
  });
});

describe("Module 4 idempotency migration", () => {
  it("contains the required durable keys and corrected turn constraint", async () => {
    const migration = await readFile(
      "supabase/migrations/20260728000100_m4_counselor_idempotency.sql",
      "utf8",
    );

    expect(migration).toContain("start_idempotency_key");
    expect(migration).toContain("conversation_messages_conversation_turn_key");
    expect(migration).toContain("producer_event_id");
    expect(migration).toContain("report_snapshots_user_idempotency_key_key");
    expect(migration).toContain("conversations_one_active_per_user_idx");
    expect(migration).toContain("drop constraint if exists conversation_messages_turn_number_key");
  });
});
