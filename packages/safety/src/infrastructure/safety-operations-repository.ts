import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  AuditEvent,
  CreateHandoffRequest,
  CreateHandoffResponse,
  HandoffAction,
  HandoffReason,
  SafetyCheckRequest,
  SafetyCheckResponse,
  SafetyDecision,
  StaffPacket,
  StaffPacketResponse,
  StaffQueueActionRequest,
  StaffQueueActionResponse,
  StaffQueueItem,
  StaffQueueResponse,
} from "@yuvanext/contracts";
import { withTransaction } from "@yuvanext/database";
import { createSyntheticHandoffPacket } from "../domain/handoff-packets.js";
import { evaluateSafetyCheck } from "../domain/safety-rules.js";
import { handoffPriorityByReason, sortStaffQueueItems } from "../domain/staff-queue.js";
import {
  SAFETY_POLICY_VERSION,
  SAFETY_RULE_SET_VERSION,
  SAFETY_SOURCE_DOCUMENT_REF,
  approvedSafetyMessages,
  safetyClassifierRules,
} from "../domain/safety-policy.js";

type JsonObject = Record<string, unknown>;

type SafetyLookup = {
  approved_message_id: string | null;
  rule_set_id: string;
};

const safetyPolicyVersionId = "84211111-1111-4111-8111-111111111111";
const safetyRuleSetId = "85211111-1111-4111-8111-111111111111";
const approvedMessageIds: Record<string, string> = {
  "mock_safety.tier_1": "86211111-1111-4111-8111-111111111111",
  "mock_safety.tier_2": "86211111-1111-4111-8111-111111111112",
  "mock_safety.tier_3": "86211111-1111-4111-8111-111111111113",
};

type HandoffRow = {
  actioned_at: Date | string | null;
  alerted_at: Date | string | null;
  closed_at: Date | string | null;
  id: string;
  priority: number;
  queued_at: Date | string;
  reason: string;
  status: string;
  tier: string | null;
  user_id: string;
};

type UserProfileRow = {
  age_band: string;
  first_name: string;
  segment: string;
  state: string;
  user_id: string;
};

type ProfileSnapshotRow = {
  id: string;
  intake_summary_json: unknown;
  result_summary_json: unknown;
};

type RecommendationRow = {
  id: string;
  item_count: number;
  output_hash: string;
};

type MessageRow = {
  content: string;
  created_at: Date | string;
  role: string;
};

export type SafetyOperationsRepository = {
  createHandoff: (request: CreateHandoffRequest) => Promise<CreateHandoffResponse>;
  getStaffPacket: (
    userId: string,
    includeFlaggedExcerpt: boolean,
  ) => Promise<StaffPacketResponse | undefined>;
  listStaffQueue: () => Promise<StaffQueueResponse>;
  recordQueueAction: (
    handoffId: string,
    request: StaffQueueActionRequest,
  ) => Promise<StaffQueueActionResponse | undefined>;
  runSafetyCheck: (request: SafetyCheckRequest) => Promise<SafetyCheckResponse>;
};

const asIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const hashText = (value: string): string => createHash("sha256").update(value).digest("hex");

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};

const findStringValue = (value: unknown, keys: readonly string[]): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const object = value as JsonObject;
  for (const key of keys) {
    const directValue = object[key];
    if (typeof directValue === "string" && directValue.trim()) {
      return directValue.trim();
    }
  }

  for (const nestedValue of Object.values(object)) {
    const found = findStringValue(nestedValue, keys);
    if (found) {
      return found;
    }
  }

  return undefined;
};

const statusForAction = (actionType: StaffQueueActionRequest["actionType"]): StaffQueueItem["status"] => {
  if (actionType === "actioned") {
    return "actioned";
  }

  if (actionType === "closed") {
    return "closed";
  }

  return "queued";
};

const toQueueItem = (row: HandoffRow): StaffQueueItem => ({
  handoffId: row.id,
  userId: row.user_id,
  reason: row.reason as HandoffReason,
  priority: row.priority,
  status: row.status as StaffQueueItem["status"],
  queuedAt: asIsoString(row.queued_at),
  ...(row.tier ? { tier: row.tier as StaffQueueItem["tier"] } : {}),
  ...(row.alerted_at ? { alertedAt: asIsoString(row.alerted_at) } : {}),
  ...(row.actioned_at ? { actionedAt: asIsoString(row.actioned_at) } : {}),
});

const createAuditEvent = (input: Omit<AuditEvent, "ipHash">): AuditEvent => ({
  ...input,
  ipHash: null,
});

const insertAuditEvent = async (client: PoolClient, auditEvent: AuditEvent): Promise<void> => {
  await client.query(
    `
      insert into operations.audit_events (
        id,
        actor_type,
        actor_id,
        action,
        target_type,
        target_id,
        request_correlation_id,
        safe_metadata_json,
        ip_hash,
        occurred_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
      on conflict (id) do update set
        actor_type = excluded.actor_type,
        actor_id = excluded.actor_id,
        action = excluded.action,
        target_type = excluded.target_type,
        target_id = excluded.target_id,
        request_correlation_id = excluded.request_correlation_id,
        safe_metadata_json = excluded.safe_metadata_json,
        ip_hash = excluded.ip_hash,
        occurred_at = excluded.occurred_at
    `,
    [
      auditEvent.id,
      auditEvent.actorType,
      auditEvent.actorId,
      auditEvent.action,
      auditEvent.targetType,
      auditEvent.targetId,
      auditEvent.requestCorrelationId,
      JSON.stringify(auditEvent.safeMetadata),
      auditEvent.ipHash,
      auditEvent.occurredAt,
    ],
  );
};

const ensureSafetyRegistry = async (client: PoolClient, occurredAt: string): Promise<void> => {
  await client.query(
    `
      insert into safety_private.safety_policy_versions (
        id,
        version,
        status,
        policy_hash,
        source_document_ref,
        effective_from,
        approved_by,
        approved_at,
        created_at
      )
      values ($1, $2, $3, $4, $5, $6, null, $6, $6)
      on conflict (version) do update set
        status = excluded.status,
        policy_hash = excluded.policy_hash,
        source_document_ref = excluded.source_document_ref,
        effective_from = excluded.effective_from,
        approved_at = excluded.approved_at
    `,
    [
      safetyPolicyVersionId,
      SAFETY_POLICY_VERSION,
      "approved",
      hashText(JSON.stringify(approvedSafetyMessages)),
      SAFETY_SOURCE_DOCUMENT_REF,
      occurredAt,
    ],
  );

  for (const message of approvedSafetyMessages) {
    await client.query(
      `
        insert into safety_private.approved_safety_messages (
          id,
          policy_version_id,
          message_key,
          tier,
          language,
          content,
          helpline_refs_json,
          status,
          content_hash
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        on conflict (policy_version_id, message_key, language) do update set
          tier = excluded.tier,
          content = excluded.content,
          helpline_refs_json = excluded.helpline_refs_json,
          status = excluded.status,
          content_hash = excluded.content_hash
      `,
      [
        approvedMessageIds[message.key],
        safetyPolicyVersionId,
        message.key,
        message.tier,
        message.language,
        message.content,
        JSON.stringify([]),
        "approved",
        hashText(message.content),
      ],
    );
  }

  await client.query(
    `
      insert into safety_private.safety_rule_sets (
        id,
        policy_version_id,
        version,
        rule_type,
        rules_json,
        classifier_name,
        classifier_version,
        status,
        approved_at
      )
      values ($1, $2, $3, $4, $5::jsonb, null, null, $6, $7)
      on conflict (version) do update set
        policy_version_id = excluded.policy_version_id,
        rule_type = excluded.rule_type,
        rules_json = excluded.rules_json,
        status = excluded.status,
        approved_at = excluded.approved_at
    `,
    [
      safetyRuleSetId,
      safetyPolicyVersionId,
      SAFETY_RULE_SET_VERSION,
      "classifier",
      JSON.stringify(safetyClassifierRules),
      "approved",
      occurredAt,
    ],
  );
};

const findSafetyLookup = async (
  client: PoolClient,
  decision: SafetyDecision,
  occurredAt: string,
): Promise<SafetyLookup> => {
  await ensureSafetyRegistry(client, occurredAt);

  const lookupResult = await client.query<SafetyLookup>(
    `
      select
        rule_sets.id as rule_set_id,
        approved_messages.id as approved_message_id
      from safety_private.safety_rule_sets rule_sets
      left join safety_private.approved_safety_messages approved_messages
        on approved_messages.message_key = $1
        and approved_messages.language = 'en'
        and approved_messages.status = 'approved'
      where rule_sets.version = $2
      limit 1
    `,
    [decision.approvedMessageKey ?? null, SAFETY_RULE_SET_VERSION],
  );

  const lookup = lookupResult.rows[0];
  if (!lookup) {
    throw new Error(`Approved safety rule set not found: ${SAFETY_RULE_SET_VERSION}`);
  }

  return lookup;
};

const getLatestSafetyEventForUser = async (
  client: PoolClient,
  userId: string,
): Promise<{ conversation_id: string | null; id: string; tier: string | null } | undefined> => {
  const safetyEventResult = await client.query<{
    conversation_id: string | null;
    id: string;
    tier: string | null;
  }>(
    `
      select id, tier, conversation_id
      from safety_private.safety_events
      where user_id = $1
      order by occurred_at desc
      limit 1
    `,
    [userId],
  );

  return safetyEventResult.rows[0];
};

export const createPostgresSafetyOperationsRepository = (
  pool: Pool,
): SafetyOperationsRepository => ({
  async runSafetyCheck(request) {
    const decision = evaluateSafetyCheck(request);

    await withTransaction(pool, async (client) => {
      const lookup = await findSafetyLookup(client, decision, request.occurredAt);

      await client.query(
        `
          insert into safety_private.safety_events (
            id,
            user_id,
            session_id,
            conversation_id,
            assessment_run_id,
            source_event_id,
            trigger_type,
            tier,
            decision,
            rule_set_id,
            approved_message_id,
            trigger_excerpt_ciphertext,
            encryption_key_version,
            trigger_hash,
            pause_journey,
            create_handoff,
            occurred_at,
            created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, null, $12, $13, $14, $15, $16, $16)
          on conflict (source_event_id) do update set
            trigger_type = excluded.trigger_type,
            tier = excluded.tier,
            decision = excluded.decision,
            rule_set_id = excluded.rule_set_id,
            approved_message_id = excluded.approved_message_id,
            trigger_hash = excluded.trigger_hash,
            pause_journey = excluded.pause_journey,
            create_handoff = excluded.create_handoff,
            occurred_at = excluded.occurred_at
        `,
        [
          decision.decisionId,
          request.context.userId,
          request.context.sessionId,
          request.context.conversationId ?? null,
          request.context.assessmentRunId ?? null,
          request.sourceEventId,
          request.triggerType,
          decision.tier ?? null,
          decision.triggered ? "triggered" : "not_triggered",
          lookup.rule_set_id,
          lookup.approved_message_id,
          "hash-only-v1",
          hashText(request.message),
          decision.pauseJourney,
          decision.createHandoff,
          request.occurredAt,
        ],
      );
    });

    return { decision };
  },

  async createHandoff(request: CreateHandoffRequest) {
    const packet = createSyntheticHandoffPacket(request);

    return withTransaction(pool, async (client) => {
      const userId = (request as CreateHandoffRequest & { userId: string }).userId;
      const safetyEvent = await getLatestSafetyEventForUser(client, userId);
      const status = packet.status;
      const queuedAt = request.trigger.occurredAt;
      const alertedAt = status === "alerted" ? queuedAt : null;

      await client.query(
        `
          insert into safety_private.handoffs (
            id,
            user_id,
            safety_event_id,
            reason,
            priority,
            profile_snapshot_id,
            recommendation_ids,
            conversation_id,
            contact_available,
            packet_snapshot_json,
            packet_hash,
            status,
            queued_at,
            alerted_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)
          on conflict (id) do update set
            reason = excluded.reason,
            priority = excluded.priority,
            packet_snapshot_json = excluded.packet_snapshot_json,
            packet_hash = excluded.packet_hash,
            status = excluded.status,
            queued_at = excluded.queued_at,
            alerted_at = excluded.alerted_at
        `,
        [
          packet.handoffId,
          userId,
          safetyEvent?.id ?? null,
          request.reason,
          handoffPriorityByReason[request.reason],
          request.profile.profileSnapshotId ?? null,
          null,
          safetyEvent?.conversation_id ?? null,
          request.consentedContactAvailable,
          JSON.stringify(packet),
          hashText(JSON.stringify(packet)),
          status,
          queuedAt,
          alertedAt,
        ],
      );

      const auditEvent = createAuditEvent({
        id: request.requestCorrelationId,
        actorType: "service",
        actorId: null,
        action: "safety.handoff.create",
        targetType: "handoff",
        targetId: packet.handoffId,
        requestCorrelationId: request.requestCorrelationId,
        safeMetadata: {
          reason: request.reason,
          status,
          priority: handoffPriorityByReason[request.reason],
        },
        occurredAt: queuedAt,
      });
      await insertAuditEvent(client, auditEvent);

      return { packet };
    });
  },

  async listStaffQueue() {
    const rows = await pool.query<HandoffRow>(
      `
        select
          handoffs.id,
          handoffs.user_id,
          handoffs.reason,
          safety_events.tier,
          handoffs.priority,
          handoffs.status,
          handoffs.queued_at,
          handoffs.alerted_at,
          handoffs.actioned_at,
          handoffs.closed_at
        from safety_private.handoffs handoffs
        left join safety_private.safety_events safety_events
          on safety_events.id = handoffs.safety_event_id
        where handoffs.status not in ('closed', 'cancelled')
        order by handoffs.priority asc, handoffs.queued_at asc
      `,
    );

    return { items: sortStaffQueueItems(rows.rows.map(toQueueItem)) };
  },

  async recordQueueAction(handoffId, request) {
    return withTransaction(pool, async (client) => {
      const handoffResult = await client.query<HandoffRow>(
        `
          select
            handoffs.id,
            handoffs.user_id,
            handoffs.reason,
            safety_events.tier,
            handoffs.priority,
            handoffs.status,
            handoffs.queued_at,
            handoffs.alerted_at,
            handoffs.actioned_at,
            handoffs.closed_at
          from safety_private.handoffs handoffs
          left join safety_private.safety_events safety_events
            on safety_events.id = handoffs.safety_event_id
          where handoffs.id = $1
        `,
        [handoffId],
      );
      const handoffRow = handoffResult.rows[0];
      if (!handoffRow) {
        return undefined;
      }

      const status = statusForAction(request.actionType);
      await client.query(
        `
          insert into safety_private.handoff_actions (
            id,
            handoff_id,
            actor_staff_id,
            action_type,
            action_category,
            note_ciphertext,
            encryption_key_version,
            occurred_at
          )
          values ($1, $2, $3, $4, $5, null, $6, $7)
          on conflict (id) do update set
            action_type = excluded.action_type,
            action_category = excluded.action_category,
            occurred_at = excluded.occurred_at
        `,
        [
          request.idempotencyKey,
          handoffId,
          request.actorStaffId,
          request.actionType,
          request.actionCategory,
          "note-redacted-v1",
          request.occurredAt,
        ],
      );

      await client.query(
        `
          update safety_private.handoffs
          set
            status = $1,
            actioned_at = case when $1 = 'actioned' then $2 else actioned_at end,
            closed_at = case when $1 = 'closed' then $2 else closed_at end
          where id = $3
        `,
        [status, request.occurredAt, handoffId],
      );

      const action: HandoffAction = {
        actionId: request.idempotencyKey,
        handoffId,
        actorStaffId: request.actorStaffId,
        actionType: request.actionType,
        actionCategory: request.actionCategory,
        noteRecorded: true,
        occurredAt: request.occurredAt,
      };
      const item: StaffQueueItem = {
        ...toQueueItem(handoffRow),
        status,
        actionedAt: status === "actioned" ? request.occurredAt : toQueueItem(handoffRow).actionedAt,
      };
      const auditEvent = createAuditEvent({
        id: request.idempotencyKey,
        actorType: "staff",
        actorId: request.actorStaffId,
        action: "staff.queue.action",
        targetType: "handoff",
        targetId: handoffId,
        requestCorrelationId: request.requestCorrelationId,
        safeMetadata: {
          actionType: request.actionType,
          actionCategory: request.actionCategory,
          noteRecorded: true,
        },
        occurredAt: request.occurredAt,
      });
      await insertAuditEvent(client, auditEvent);

      return { action, item, auditEvent };
    });
  },

  async getStaffPacket(userId, includeFlaggedExcerpt) {
    return withTransaction(pool, async (client) => {
      const userResult = await client.query<UserProfileRow>(
        `
          select user_id, first_name, age_band, segment, state
          from assessment.user_profiles
          where user_id = $1 and profile_status <> 'deleted'
        `,
        [userId],
      );
      const user = userResult.rows[0];
      if (!user) {
        return undefined;
      }

      const profileResult = await client.query<ProfileSnapshotRow>(
        `
          select id, intake_summary_json, result_summary_json
          from assessment.profile_snapshots
          where user_id = $1
          order by profile_version desc, created_at desc
          limit 1
        `,
        [userId],
      );
      const profile = profileResult.rows[0];
      if (!profile) {
        return undefined;
      }

      const recommendationResult = await client.query<RecommendationRow>(
        `
          select
            recommendation_runs.id,
            recommendation_runs.output_hash,
            count(recommendation_items.id)::int as item_count
          from recommendation.recommendation_runs
          left join recommendation.recommendation_items
            on recommendation_items.recommendation_run_id = recommendation_runs.id
          where recommendation_runs.user_id = $1
          group by recommendation_runs.id, recommendation_runs.output_hash, recommendation_runs.created_at
          order by recommendation_runs.created_at desc
          limit 1
        `,
        [userId],
      );
      const recommendation = recommendationResult.rows[0];

      const handoffResult = await client.query<HandoffRow>(
        `
          select
            handoffs.id,
            handoffs.user_id,
            handoffs.reason,
            safety_events.tier,
            handoffs.priority,
            handoffs.status,
            handoffs.queued_at,
            handoffs.alerted_at,
            handoffs.actioned_at,
            handoffs.closed_at
          from safety_private.handoffs handoffs
          left join safety_private.safety_events safety_events
            on safety_events.id = handoffs.safety_event_id
          where handoffs.user_id = $1
          order by handoffs.queued_at desc
          limit 1
        `,
        [userId],
      );
      const handoff = handoffResult.rows[0];

      const messages = includeFlaggedExcerpt
        ? await client.query<MessageRow>(
            `
              select conversation_messages.role, conversation_messages.content, conversation_messages.created_at
              from counselor.conversation_messages
              inner join counselor.conversations
                on conversations.id = conversation_messages.conversation_id
              where conversations.user_id = $1
                and conversation_messages.role in ('user', 'assistant')
              order by conversation_messages.created_at desc
              limit 5
            `,
            [userId],
          )
        : undefined;

      const intakeSummary = asObject(profile.intake_summary_json);
      const resultSummary = asObject(profile.result_summary_json);
      const flags: StaffPacket["flags"] = {
        hasSafetyEvent: Boolean(handoff?.tier),
        handoffStatus: (handoff?.status ?? "queued") as StaffPacket["flags"]["handoffStatus"],
        ...(handoff?.tier ? { highestTier: handoff.tier as StaffPacket["flags"]["highestTier"] } : {}),
      };

      const packet: StaffPacket = {
        userId,
        user: {
          firstName: user.first_name,
          ageBand: user.age_band,
          segment: user.segment as StaffPacket["user"]["segment"],
        },
        intake: {
          state: user.state,
          instruments: ["profile_snapshot"],
          completionPercent:
            typeof intakeSummary.completionPercent === "number"
              ? Math.max(0, Math.min(100, Math.trunc(intakeSummary.completionPercent)))
              : 100,
        },
        profile: {
          profileSnapshotId: profile.id,
          code:
            findStringValue(resultSummary, ["code", "riasecCode", "topCode", "primaryCode"]) ??
            "unavailable",
          confidence:
            findStringValue(resultSummary, ["confidence"]) === "soft" ? "soft" : "normal",
        },
        recommendations: {
          recommendationSetId: recommendation?.id ?? profile.id,
          versionHash: recommendation?.output_hash ?? hashText(profile.id),
          itemCount: recommendation?.item_count ?? 0,
        },
        flags,
        conversationExcerpts: messages
          ? messages.rows.reverse().map((message) => ({
              role: message.role as "user" | "assistant",
              content: message.content.slice(0, 500),
              occurredAt: asIsoString(message.created_at),
            }))
          : undefined,
      };

      const auditEvent = createAuditEvent({
        id: userId,
        actorType: "staff",
        actorId: null,
        action: "staff.packet.view",
        targetType: "user_profile",
        targetId: userId,
        requestCorrelationId: userId,
        safeMetadata: {
          includeFlaggedExcerpt,
          hasSafetyEvent: packet.flags.hasSafetyEvent,
          highestTier: packet.flags.highestTier ?? null,
        },
        occurredAt: new Date().toISOString(),
      });
      await insertAuditEvent(client, auditEvent);

      return { packet, auditEvent };
    });
  },
});
