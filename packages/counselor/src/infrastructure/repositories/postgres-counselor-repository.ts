import {
  ConversationMessageSchema,
  ConversationSchema,
  CounselorToolCallSchema,
  CreateJourneyEventResponseSchema,
  ExplorationEventSchema,
  GeneratedAssetSchema,
  JourneyEventSchema,
  JourneyStateSchema,
  ReportSnapshotSchema,
  StartConversationResponseSchema,
  type Conversation,
  type ConversationMessage,
  type CounselorToolCall,
  type CreateJourneyEventResponse,
  type ExplorationEvent,
  type GeneratedAsset,
  type JourneyEvent,
  type JourneyState,
  type ReportSnapshot,
  type StartConversationResponse,
} from "@yuvanext/contracts";
import {
  withTransaction,
  type createDatabasePool,
  type Database,
  type Json,
} from "@yuvanext/database";
import {
  CounselorAccessError,
  CounselorConflictError,
  CounselorContractError,
  CounselorNotFoundError,
  type ApplyJourneyEventInput,
  type AppendMessageInput,
  type CounselorRepository,
  type MessageGroundingRecord,
  type SaveReportInput,
  type SaveGeneratedAssetInput,
  type StoredStartResult,
} from "../../application/index.js";

type CounselorTables = Database["counselor"]["Tables"];
type ConversationRow = CounselorTables["conversations"]["Row"];
type ConversationInsert = CounselorTables["conversations"]["Insert"];
type MessageRow = CounselorTables["conversation_messages"]["Row"];
type MessageInsert = CounselorTables["conversation_messages"]["Insert"];
type JourneyRow = CounselorTables["journey_states"]["Row"];
type JourneyInsert = CounselorTables["journey_states"]["Insert"];
type JourneyEventRow = CounselorTables["journey_events"]["Row"];
type ExplorationEventRow = CounselorTables["exploration_events"]["Row"];
type ToolCallRow = CounselorTables["tool_calls"]["Row"];
type ReportRow = CounselorTables["report_snapshots"]["Row"];
type GeneratedAssetRow = CounselorTables["generated_assets"]["Row"];
type MessageGroundingRow = CounselorTables["message_grounding"]["Row"];
type DatabasePool = ReturnType<typeof createDatabasePool>;
type TransactionOperation = Parameters<typeof withTransaction>[1];
type TransactionClient = Parameters<TransactionOperation>[0];
type SqlExecutor = Pick<TransactionClient, "query">;

const timestamp = (value: string): string => new Date(value).toISOString();
const nullableTimestamp = (value: string | null): string | null =>
  value === null ? null : timestamp(value);
const toJson = (value: unknown): Json => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new CounselorContractError("Value is not JSON serializable");
  }
  const parsed: unknown = JSON.parse(serialized);
  return parsed as Json;
};

export class PostgresCounselorRepository implements CounselorRepository {
  constructor(private readonly pool: DatabasePool) {}

  findStartResult(
    userId: string,
    idempotencyKey: string,
  ): Promise<StartConversationResponse | null> {
    return this.loadStartByIdempotency(this.pool, userId, idempotencyKey);
  }

  findActiveStartResult(userId: string): Promise<StartConversationResponse | null> {
    return this.loadActiveStart(this.pool, userId);
  }

  saveStartResult(input: StoredStartResult): Promise<StartConversationResponse> {
    return withTransaction(this.pool, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [input.userId]);

      const retry = await this.loadStartByIdempotency(client, input.userId, input.idempotencyKey);
      if (retry) {
        return retry;
      }

      const active = await this.loadActiveStart(client, input.userId);
      if (active) {
        return active;
      }

      const conversation = input.response.conversation;
      const conversationInsert: ConversationInsert = {
        id: conversation.conversationId,
        user_id: input.userId,
        start_idempotency_key: input.idempotencyKey,
        profile_snapshot_id: conversation.profileSnapshotId,
        segment: conversation.segment,
        status: conversation.status,
        channel: conversation.channel,
        language: conversation.language,
        ai_mode: conversation.aiMode,
        started_at: conversation.startedAt,
        last_turn_at: conversation.lastTurnAt,
        completed_at: conversation.completedAt,
        created_at: conversation.startedAt,
      };
      await client.query(
        `insert into counselor.conversations (
          id, user_id, start_idempotency_key, profile_snapshot_id, segment,
          status, channel, language, ai_mode, started_at, last_turn_at,
          completed_at, created_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )`,
        [
          conversationInsert.id,
          conversationInsert.user_id,
          conversationInsert.start_idempotency_key,
          conversationInsert.profile_snapshot_id,
          conversationInsert.segment,
          conversationInsert.status,
          conversationInsert.channel,
          conversationInsert.language,
          conversationInsert.ai_mode,
          conversationInsert.started_at,
          conversationInsert.last_turn_at,
          conversationInsert.completed_at,
          conversationInsert.created_at,
        ],
      );

      const journey = input.response.journey;
      const journeyInsert: JourneyInsert = {
        user_id: input.userId,
        conversation_id: journey.conversationId,
        current_step: journey.currentStep,
        current_state_key: journey.currentStateKey,
        profile_snapshot_id: journey.profileSnapshotId,
        current_recommendation_id: journey.currentRecommendationId,
        current_assessment_run_id: journey.currentAssessmentRunId,
        is_safety_paused: journey.isSafetyPaused,
        state_json: toJson(journey.state),
        lock_version: journey.lockVersion,
        last_idempotency_key: input.idempotencyKey,
        updated_at: journey.updatedAt,
      };
      await client.query(
        `insert into counselor.journey_states (
          user_id, conversation_id, current_step, current_state_key,
          profile_snapshot_id, current_recommendation_id,
          current_assessment_run_id, is_safety_paused, state_json,
          lock_version, last_idempotency_key, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        on conflict (user_id) do update set
          conversation_id = excluded.conversation_id,
          current_step = excluded.current_step,
          current_state_key = excluded.current_state_key,
          profile_snapshot_id = excluded.profile_snapshot_id,
          current_recommendation_id = excluded.current_recommendation_id,
          current_assessment_run_id = excluded.current_assessment_run_id,
          is_safety_paused = excluded.is_safety_paused,
          state_json = excluded.state_json,
          lock_version = excluded.lock_version,
          last_idempotency_key = excluded.last_idempotency_key,
          updated_at = excluded.updated_at`,
        [
          journeyInsert.user_id,
          journeyInsert.conversation_id,
          journeyInsert.current_step,
          journeyInsert.current_state_key,
          journeyInsert.profile_snapshot_id,
          journeyInsert.current_recommendation_id,
          journeyInsert.current_assessment_run_id,
          journeyInsert.is_safety_paused,
          journeyInsert.state_json,
          journeyInsert.lock_version,
          journeyInsert.last_idempotency_key,
          journeyInsert.updated_at,
        ],
      );

      const message = input.welcomeMessage;
      const messageInsert: MessageInsert = {
        id: message.messageId,
        conversation_id: message.conversationId,
        idempotency_key: input.idempotencyKey,
        client_message_id: null,
        turn_number: message.turnNumber,
        role: message.role,
        content: message.content,
        content_language: message.contentLanguage,
        message_status: message.status,
        flags: message.flags,
        created_at: message.createdAt,
      };
      await client.query(
        `insert into counselor.conversation_messages (
          id, conversation_id, idempotency_key, client_message_id, turn_number,
          role, content, content_language, message_status, flags, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          messageInsert.id,
          messageInsert.conversation_id,
          messageInsert.idempotency_key,
          messageInsert.client_message_id,
          messageInsert.turn_number,
          messageInsert.role,
          messageInsert.content,
          messageInsert.content_language,
          messageInsert.message_status,
          messageInsert.flags,
          messageInsert.created_at,
        ],
      );

      return StartConversationResponseSchema.parse(input.response);
    });
  }

  async findConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    const result = await this.pool.query<ConversationRow>(
      `select * from counselor.conversations
       where id = $1 and user_id = $2`,
      [conversationId, userId],
    );
    return result.rows[0] ? this.mapConversation(result.rows[0]) : null;
  }

  async listMessages(userId: string, conversationId: string): Promise<ConversationMessage[]> {
    const result = await this.pool.query<MessageRow>(
      `select m.*
       from counselor.conversation_messages m
       join counselor.conversations c on c.id = m.conversation_id
       where m.conversation_id = $1 and c.user_id = $2
       order by m.turn_number asc`,
      [conversationId, userId],
    );
    return result.rows.map((row) => this.mapMessage(row));
  }

  async appendMessage(input: AppendMessageInput): Promise<ConversationMessage> {
    const message = input.message;
    const result = await this.pool.query<MessageRow>(
      `with inserted as (
        insert into counselor.conversation_messages (
          id, conversation_id, idempotency_key, client_message_id, turn_number,
          role, content, content_language, message_status, flags, created_at
        )
        select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        where exists (
          select 1 from counselor.conversations
          where id = $2 and user_id = $12
        )
        on conflict do nothing
        returning *
      )
      select * from inserted
      union all
      select m.*
      from counselor.conversation_messages m
      join counselor.conversations c on c.id = m.conversation_id
      where not exists (select 1 from inserted)
        and c.user_id = $12
        and m.conversation_id = $2
        and (
          m.idempotency_key = $3
          or ($4::uuid is not null and m.client_message_id = $4)
        )
      limit 1`,
      [
        message.messageId,
        message.conversationId,
        input.idempotencyKey,
        input.clientMessageId,
        message.turnNumber,
        message.role,
        message.content,
        message.contentLanguage,
        message.status,
        message.flags,
        message.createdAt,
        input.userId,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      throw new CounselorAccessError("Conversation access denied");
    }
    return this.mapMessage(row);
  }

  async getJourneyState(userId: string): Promise<JourneyState | null> {
    const result = await this.pool.query<JourneyRow>(
      "select * from counselor.journey_states where user_id = $1",
      [userId],
    );
    return result.rows[0] ? this.mapJourney(result.rows[0]) : null;
  }

  async saveJourneyState(
    userId: string,
    journey: JourneyState,
    expectedLockVersion: number,
    idempotencyKey: string,
  ): Promise<JourneyState> {
    const retry = await this.pool.query<JourneyRow>(
      `select * from counselor.journey_states
       where user_id = $1 and last_idempotency_key = $2`,
      [userId, idempotencyKey],
    );
    if (retry.rows[0]) {
      return this.mapJourney(retry.rows[0]);
    }

    const result = await this.pool.query<JourneyRow>(
      `update counselor.journey_states set
        conversation_id = $2,
        current_step = $3,
        current_state_key = $4,
        profile_snapshot_id = $5,
        current_recommendation_id = $6,
        current_assessment_run_id = $7,
        is_safety_paused = $8,
        state_json = $9,
        lock_version = $10,
        last_idempotency_key = $11,
        updated_at = $12
      where user_id = $1 and lock_version = $13
      returning *`,
      [
        userId,
        journey.conversationId,
        journey.currentStep,
        journey.currentStateKey,
        journey.profileSnapshotId,
        journey.currentRecommendationId,
        journey.currentAssessmentRunId,
        journey.isSafetyPaused,
        journey.state,
        journey.lockVersion,
        idempotencyKey,
        journey.updatedAt,
        expectedLockVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      throw new CounselorConflictError("Journey state optimistic lock conflict");
    }
    return this.mapJourney(row);
  }

  applyJourneyEvent(input: ApplyJourneyEventInput): Promise<CreateJourneyEventResponse> {
    return withTransaction(this.pool, async (client) => {
      const existingEvent = await client.query<JourneyEventRow>(
        `select * from counselor.journey_events
         where producer_event_id = $1 and user_id = $2`,
        [input.producerEventId, input.userId],
      );
      if (existingEvent.rows[0]) {
        const journeyResult = await client.query<JourneyRow>(
          "select * from counselor.journey_states where user_id = $1",
          [input.userId],
        );
        const journeyRow = journeyResult.rows[0];
        if (!journeyRow) {
          throw new CounselorContractError("Stored journey event has no journey state");
        }
        return CreateJourneyEventResponseSchema.parse({
          event: this.mapJourneyEvent(existingEvent.rows[0]),
          journey: this.mapJourney(journeyRow),
        });
      }

      const journeyResult = await client.query<JourneyRow>(
        `select * from counselor.journey_states
         where user_id = $1
         for update`,
        [input.userId],
      );
      const journeyRow = journeyResult.rows[0];
      if (!journeyRow) {
        throw new CounselorNotFoundError("Journey state was not found");
      }
      if ((journeyRow.lock_version ?? 0) !== input.expectedLockVersion) {
        throw new CounselorConflictError("Journey state optimistic lock conflict");
      }
      if (input.event.conversationId && journeyRow.conversation_id !== input.event.conversationId) {
        throw new CounselorAccessError("Journey event access denied");
      }

      const updatedJourney = await client.query<JourneyRow>(
        `update counselor.journey_states set
          lock_version = lock_version + 1,
          last_idempotency_key = $2,
          updated_at = $3
         where user_id = $1
         returning *`,
        [input.userId, input.idempotencyKey, input.event.occurredAt],
      );
      const insertedEvent = await client.query<JourneyEventRow>(
        `insert into counselor.journey_events (
          id, user_id, producer_event_id, conversation_id, event_type,
          event_schema_version, related_entity_type, related_entity_id,
          metadata_json, occurred_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning *`,
        [
          input.event.eventId,
          input.userId,
          input.producerEventId,
          input.event.conversationId,
          input.event.eventType,
          input.event.eventSchemaVersion,
          input.event.relatedEntityType,
          input.event.relatedEntityId,
          input.event.metadata,
          input.event.occurredAt,
        ],
      );
      const updatedJourneyRow = updatedJourney.rows[0];
      const insertedEventRow = insertedEvent.rows[0];
      if (!updatedJourneyRow || !insertedEventRow) {
        throw new CounselorContractError("Journey event transaction returned no result");
      }
      return CreateJourneyEventResponseSchema.parse({
        event: this.mapJourneyEvent(insertedEventRow),
        journey: this.mapJourney(updatedJourneyRow),
      });
    });
  }

  async recordToolCall(userId: string, toolCall: CounselorToolCall): Promise<CounselorToolCall> {
    const inserted = await this.pool.query<ToolCallRow>(
      `insert into counselor.tool_calls (
        id, conversation_id, request_message_id, tool_name,
        tool_schema_version, input_json, input_hash, output_snapshot_json,
        output_hash, source_versions_json, status, latency_ms, error_code,
        started_at, completed_at
      )
      select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      where exists (
        select 1 from counselor.conversations
        where id = $2 and user_id = $16
      )
      on conflict (id) do nothing
      returning *`,
      [
        toolCall.toolCallId,
        toolCall.conversationId,
        toolCall.requestMessageId,
        toolCall.toolName,
        toolCall.toolSchemaVersion,
        toolCall.input,
        toolCall.inputHash,
        toolCall.outputSnapshot,
        toolCall.outputHash,
        toolCall.sourceVersions,
        toolCall.status,
        toolCall.latencyMs,
        toolCall.errorCode,
        toolCall.startedAt,
        toolCall.completedAt,
        userId,
      ],
    );
    const row =
      inserted.rows[0] ??
      (
        await this.pool.query<ToolCallRow>(
          `select t.*
           from counselor.tool_calls t
           join counselor.conversations c on c.id = t.conversation_id
           where t.id = $1 and c.user_id = $2`,
          [toolCall.toolCallId, userId],
        )
      ).rows[0];
    if (!row) {
      throw new CounselorAccessError("Conversation access denied");
    }
    return this.mapToolCall(row);
  }

  async recordMessageGrounding(userId: string, records: MessageGroundingRecord[]): Promise<void> {
    for (const record of records) {
      const result = await this.pool.query<MessageGroundingRow>(
        `insert into counselor.message_grounding (
          id, assistant_message_id, tool_call_id, entity_type, entity_id,
          display_name, allowed_numbers_json, allowed_urls, source_version
        )
        select $1, $2, $3, $4, $5, $6, $7, $8, $9
        where exists (
          select 1
          from counselor.tool_calls t
          join counselor.conversations c on c.id = t.conversation_id
          where t.id = $3 and c.user_id = $10
        )
        on conflict (id) do nothing
        returning *`,
        [
          record.groundingId,
          record.assistantMessageId,
          record.toolCallId,
          record.entityType,
          record.entityId,
          record.displayName,
          record.allowedNumbers,
          record.allowedUrls,
          record.sourceVersion,
          userId,
        ],
      );
      if (!result.rows[0]) {
        const existing = await this.pool.query<MessageGroundingRow>(
          `select g.*
           from counselor.message_grounding g
           join counselor.tool_calls t on t.id = g.tool_call_id
           join counselor.conversations c on c.id = t.conversation_id
           where g.id = $1 and c.user_id = $2`,
          [record.groundingId, userId],
        );
        if (!existing.rows[0]) {
          throw new CounselorAccessError("Message grounding access denied");
        }
      }
    }
  }

  async recordJourneyEvent(
    userId: string,
    event: JourneyEvent,
    producerEventId: string,
  ): Promise<JourneyEvent> {
    const inserted = await this.pool.query<JourneyEventRow>(
      `insert into counselor.journey_events (
        id, user_id, producer_event_id, conversation_id, event_type,
        event_schema_version, related_entity_type, related_entity_id,
        metadata_json, occurred_at
      )
      select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      where $4::uuid is null or exists (
        select 1 from counselor.conversations
        where id = $4 and user_id = $2
      )
      on conflict (producer_event_id) do nothing
      returning *`,
      [
        event.eventId,
        userId,
        producerEventId,
        event.conversationId,
        event.eventType,
        event.eventSchemaVersion,
        event.relatedEntityType,
        event.relatedEntityId,
        event.metadata,
        event.occurredAt,
      ],
    );
    const row =
      inserted.rows[0] ??
      (
        await this.pool.query<JourneyEventRow>(
          `select * from counselor.journey_events
           where producer_event_id = $1 and user_id = $2`,
          [producerEventId, userId],
        )
      ).rows[0];
    if (!row) {
      throw new CounselorAccessError("Journey event access denied");
    }
    return this.mapJourneyEvent(row);
  }

  async recordExplorationEvent(userId: string, event: ExplorationEvent): Promise<ExplorationEvent> {
    const inserted = await this.pool.query<ExplorationEventRow>(
      `insert into counselor.exploration_events (
        id, user_id, conversation_id, recommendation_id,
        recommendation_item_id, action, occurred_at, client_event_id
      )
      select $1, $2, $3, $4, $5, $6, $7, $8
      where $3::uuid is null or exists (
        select 1 from counselor.conversations
        where id = $3 and user_id = $2
      )
      on conflict (client_event_id) do nothing
      returning *`,
      [
        event.eventId,
        userId,
        event.conversationId,
        event.recommendationId,
        event.recommendationItemId,
        event.action,
        event.occurredAt,
        event.clientEventId,
      ],
    );
    const row =
      inserted.rows[0] ??
      (
        await this.pool.query<ExplorationEventRow>(
          `select * from counselor.exploration_events
           where client_event_id = $1 and user_id = $2`,
          [event.clientEventId, userId],
        )
      ).rows[0];
    if (!row) {
      throw new CounselorAccessError("Exploration event access denied");
    }
    return this.mapExplorationEvent(row);
  }

  async listExplorationEvents(userId: string, eventIds: string[]): Promise<ExplorationEvent[]> {
    if (eventIds.length === 0) {
      return [];
    }
    const result = await this.pool.query<ExplorationEventRow>(
      `select * from counselor.exploration_events
       where user_id = $1 and id = any($2::uuid[])
       order by occurred_at asc, id asc`,
      [userId, eventIds],
    );
    return result.rows.map((row) => this.mapExplorationEvent(row));
  }

  async findReport(userId: string, reportId: string): Promise<ReportSnapshot | null> {
    const result = await this.pool.query<ReportRow>(
      `select * from counselor.report_snapshots
       where id = $1 and user_id = $2`,
      [reportId, userId],
    );
    return result.rows[0] ? this.mapReport(result.rows[0]) : null;
  }

  async saveReport(input: SaveReportInput): Promise<ReportSnapshot> {
    const report = input.report;
    const inserted = await this.pool.query<ReportRow>(
      `insert into counselor.report_snapshots (
        id, user_id, idempotency_key, profile_snapshot_id,
        recommendation_ids, exploration_event_ids, explored_entity_ids,
        report_schema_version, language, payload_json, payload_hash,
        summary_mode, prompt_version, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      on conflict (user_id, idempotency_key) do nothing
      returning *`,
      [
        report.reportId,
        input.userId,
        input.idempotencyKey,
        report.profileSnapshotId,
        report.recommendationIds,
        input.explorationEventIds,
        report.exploredEntityIds,
        report.reportSchemaVersion,
        report.language,
        report.payload,
        report.payloadHash,
        report.summaryMode,
        report.promptVersion,
        report.createdAt,
      ],
    );
    const row =
      inserted.rows[0] ??
      (
        await this.pool.query<ReportRow>(
          `select * from counselor.report_snapshots
           where user_id = $1 and idempotency_key = $2`,
          [input.userId, input.idempotencyKey],
        )
      ).rows[0];
    if (!row) {
      throw new CounselorConflictError("Report write conflict");
    }
    return this.mapReport(row);
  }

  async saveGeneratedAsset(input: SaveGeneratedAssetInput): Promise<GeneratedAsset> {
    const asset = input.asset;
    const inserted = await this.pool.query<GeneratedAssetRow>(
      `insert into counselor.generated_assets (
        id, user_id, report_snapshot_id, asset_type, storage_bucket,
        storage_path, content_hash, privacy_class, generation_status,
        expires_at, created_at, idempotency_key
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      on conflict (user_id, idempotency_key) do nothing
      returning *`,
      [
        asset.assetId,
        input.userId,
        asset.reportId,
        asset.assetType,
        asset.storageBucket,
        asset.storagePath,
        asset.contentHash,
        asset.privacyClass,
        asset.generationStatus,
        asset.expiresAt,
        asset.createdAt,
        input.idempotencyKey,
      ],
    );
    const row =
      inserted.rows[0] ??
      (
        await this.pool.query<GeneratedAssetRow>(
          `select * from counselor.generated_assets
           where user_id = $1 and idempotency_key = $2`,
          [input.userId, input.idempotencyKey],
        )
      ).rows[0];
    if (!row) {
      throw new CounselorConflictError("Generated asset write conflict");
    }
    return this.mapGeneratedAsset(row);
  }

  async findGeneratedAsset(userId: string, idempotencyKey: string): Promise<GeneratedAsset | null> {
    const result = await this.pool.query<GeneratedAssetRow>(
      `select * from counselor.generated_assets
       where user_id = $1 and idempotency_key = $2`,
      [userId, idempotencyKey],
    );
    return result.rows[0] ? this.mapGeneratedAsset(result.rows[0]) : null;
  }

  private async loadStartByIdempotency(
    executor: SqlExecutor,
    userId: string,
    idempotencyKey: string,
  ): Promise<StartConversationResponse | null> {
    const result = await executor.query<ConversationRow>(
      `select * from counselor.conversations
       where user_id = $1 and start_idempotency_key = $2`,
      [userId, idempotencyKey],
    );
    return result.rows[0] ? this.assembleStart(executor, userId, result.rows[0]) : null;
  }

  private async loadActiveStart(
    executor: SqlExecutor,
    userId: string,
  ): Promise<StartConversationResponse | null> {
    const result = await executor.query<ConversationRow>(
      `select * from counselor.conversations
       where user_id = $1 and status = 'active'
       order by started_at desc
       limit 1`,
      [userId],
    );
    return result.rows[0] ? this.assembleStart(executor, userId, result.rows[0]) : null;
  }

  private async assembleStart(
    executor: SqlExecutor,
    userId: string,
    conversationRow: ConversationRow,
  ): Promise<StartConversationResponse> {
    const [journeyResult, messageResult] = await Promise.all([
      executor.query<JourneyRow>(
        `select * from counselor.journey_states
         where user_id = $1 and conversation_id = $2`,
        [userId, conversationRow.id],
      ),
      executor.query<MessageRow>(
        `select * from counselor.conversation_messages
         where conversation_id = $1 and role = 'system_copy'
         order by turn_number asc
         limit 1`,
        [conversationRow.id],
      ),
    ]);
    const journeyRow = journeyResult.rows[0];
    const messageRow = messageResult.rows[0];
    if (!journeyRow || !messageRow) {
      throw new CounselorContractError("Stored conversation start is incomplete");
    }

    const conversation = this.mapConversation(conversationRow);
    const journey = this.mapJourney(journeyRow);
    const message = this.mapMessage(messageRow);
    return StartConversationResponseSchema.parse({
      conversation,
      journey,
      welcomeTurn: {
        turnId: message.messageId,
        conversationId: conversation.conversationId,
        text: message.content,
        widgets: [],
        grounding: {
          toolCallIds: [],
          entityIds: [],
          recommendationIds: journey.currentRecommendationId
            ? [journey.currentRecommendationId]
            : [],
        },
        flags: message.flags,
        createdAt: message.createdAt,
      },
    });
  }

  private mapConversation(row: ConversationRow): Conversation {
    return ConversationSchema.parse({
      conversationId: row.id,
      profileSnapshotId: row.profile_snapshot_id,
      segment: row.segment,
      status: row.status,
      channel: row.channel,
      language: row.language,
      aiMode: row.ai_mode,
      startedAt: timestamp(row.started_at),
      lastTurnAt: nullableTimestamp(row.last_turn_at),
      completedAt: nullableTimestamp(row.completed_at),
    });
  }

  private mapMessage(row: MessageRow): ConversationMessage {
    return ConversationMessageSchema.parse({
      messageId: row.id,
      conversationId: row.conversation_id,
      turnNumber: row.turn_number,
      role: row.role,
      content: row.content,
      contentLanguage: row.content_language,
      status: row.message_status,
      flags: row.flags ?? [],
      createdAt: timestamp(row.created_at),
    });
  }

  private mapJourney(row: JourneyRow): JourneyState {
    return JourneyStateSchema.parse({
      conversationId: row.conversation_id,
      currentStep: row.current_step,
      currentStateKey: row.current_state_key,
      profileSnapshotId: row.profile_snapshot_id,
      currentRecommendationId: row.current_recommendation_id,
      currentAssessmentRunId: row.current_assessment_run_id,
      isSafetyPaused: row.is_safety_paused ?? false,
      state: row.state_json,
      lockVersion: row.lock_version ?? 0,
      updatedAt: timestamp(row.updated_at),
    });
  }

  private mapToolCall(row: ToolCallRow): CounselorToolCall {
    return CounselorToolCallSchema.parse({
      toolCallId: row.id,
      conversationId: row.conversation_id,
      requestMessageId: row.request_message_id,
      toolName: row.tool_name,
      toolSchemaVersion: row.tool_schema_version,
      input: row.input_json,
      inputHash: row.input_hash,
      outputSnapshot: row.output_snapshot_json,
      outputHash: row.output_hash,
      sourceVersions: row.source_versions_json,
      status: row.status,
      latencyMs: row.latency_ms,
      errorCode: row.error_code,
      startedAt: timestamp(row.started_at),
      completedAt: nullableTimestamp(row.completed_at),
    });
  }

  private mapJourneyEvent(row: JourneyEventRow): JourneyEvent {
    return JourneyEventSchema.parse({
      eventId: row.id,
      conversationId: row.conversation_id,
      eventType: row.event_type,
      eventSchemaVersion: row.event_schema_version,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      metadata: row.metadata_json,
      occurredAt: timestamp(row.occurred_at),
    });
  }

  private mapExplorationEvent(row: ExplorationEventRow): ExplorationEvent {
    return ExplorationEventSchema.parse({
      eventId: row.id,
      conversationId: row.conversation_id,
      recommendationId: row.recommendation_id,
      recommendationItemId: row.recommendation_item_id,
      action: row.action,
      occurredAt: timestamp(row.occurred_at),
      clientEventId: row.client_event_id,
    });
  }

  private mapGeneratedAsset(row: GeneratedAssetRow): GeneratedAsset {
    return GeneratedAssetSchema.parse({
      assetId: row.id,
      reportId: row.report_snapshot_id,
      assetType: row.asset_type,
      contentHash: row.content_hash,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      privacyClass: row.privacy_class,
      generationStatus: row.generation_status,
      expiresAt: timestamp(row.expires_at),
      createdAt: timestamp(row.created_at),
    });
  }

  private mapReport(row: ReportRow): ReportSnapshot {
    return ReportSnapshotSchema.parse({
      reportId: row.id,
      profileSnapshotId: row.profile_snapshot_id,
      recommendationIds: row.recommendation_ids,
      exploredEntityIds: row.explored_entity_ids,
      reportSchemaVersion: row.report_schema_version,
      language: row.language,
      payload: row.payload_json,
      payloadHash: row.payload_hash,
      summaryMode: row.summary_mode,
      promptVersion: row.prompt_version,
      createdAt: timestamp(row.created_at),
    });
  }
}
