import { randomUUID } from "node:crypto";
import type { RecommendationSet } from "@yuvanext/contracts";
import type { Pool, PoolClient } from "pg";
import { withTransaction } from "@yuvanext/database";

export type StoredRecommendationSet = RecommendationSet;

export type RecommendationStore = {
  save(set: RecommendationSet): Promise<RecommendationSet>;
  findById(recommendationId: string): Promise<RecommendationSet | undefined>;
  findByInputHash(
    profileSnapshotId: string,
    kind: RecommendationSet["kind"],
    inputHash: string,
  ): Promise<RecommendationSet | undefined>;
  clear(): Promise<void>;
};

export function createInMemoryRecommendationStore(): RecommendationStore {
  const sets = new Map<string, RecommendationSet>();

  return {
    save(set) {
      if (sets.has(set.recommendationId)) {
        return Promise.reject(new Error(`Recommendation ${set.recommendationId} already exists`));
      }

      sets.set(set.recommendationId, set);
      return Promise.resolve(set);
    },
    findById(recommendationId) {
      return Promise.resolve(sets.get(recommendationId));
    },
    findByInputHash(profileSnapshotId, kind, inputHash) {
      return Promise.resolve(
        [...sets.values()].find(
          (set) =>
            set.profileSnapshotId === profileSnapshotId &&
            set.kind === kind &&
            set.inputHash === inputHash,
        ),
      );
    },
    clear() {
      sets.clear();
      return Promise.resolve();
    },
  };
}

export type CreatePostgresRecommendationStoreOptions = {
  pool: Pool;
};

type RecommendationRunRow = {
  id: string;
  profile_snapshot_id: string;
  kind: RecommendationSet["kind"];
  algorithm_version: string;
  weights_version: string;
  source_data_versions_json: Record<string, string>;
  input_hash: string;
  output_hash: string;
  created_at: Date | string;
};

type RecommendationItemRow = {
  id: string;
  career_id: string | null;
  pathway_id: string | null;
  stream_option_id: string | null;
  college_id: string | null;
  aid_scheme_id: string | null;
  rank: number;
  fit_score: string | number | null;
  likelihood_label: string | null;
  fit_explanation_json: Record<string, unknown>;
  entity_snapshot_json: { itemId?: string; title?: string; entityType?: string } | null;
  entity_dataset_version: string;
  ring_code: "inner" | "middle" | "outer" | null;
};

export function createPostgresRecommendationStore(
  options: CreatePostgresRecommendationStoreOptions,
): RecommendationStore {
  return {
    async save(set) {
      await withTransaction(options.pool, async (client) => {
        const existing = await client.query(
          "select id from recommendation.recommendation_runs where id = $1",
          [set.recommendationId],
        );
        if ((existing.rowCount ?? 0) > 0) {
          throw new Error(`Recommendation ${set.recommendationId} already exists`);
        }

        const profile = await client.query<{ user_id: string }>(
          "select user_id from assessment.profile_snapshots where id = $1",
          [set.profileSnapshotId],
        );
        const userId = profile.rows[0]?.user_id;
        if (!userId) {
          throw new Error(`Profile snapshot ${set.profileSnapshotId} was not found`);
        }

        const configurationId = await resolveConfigurationId(client, set);

        await client.query(
          `insert into recommendation.recommendation_runs (
            id,
            user_id,
            profile_snapshot_id,
            kind,
            configuration_id,
            algorithm_version,
            weights_version,
            source_data_versions_json,
            request_context_json,
            status,
            input_hash,
            output_hash,
            created_at,
            completed_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10, $11, $12, $12)`,
          [
            set.recommendationId,
            userId,
            set.profileSnapshotId,
            set.kind,
            configurationId,
            set.algorithmVersion,
            set.weightsVersion,
            JSON.stringify(set.sourceDataVersions),
            JSON.stringify({ source: "api", itemCount: set.items.length }),
            set.inputHash,
            set.outputHash,
            set.createdAt,
          ],
        );

        const ringIds = await insertRings(client, set);
        await insertItems(client, set, ringIds);
        if (set.kind === "plan") {
          await insertGeneratedPlan(client, set, userId);
        }
      });

      return set;
    },

    async findById(recommendationId) {
      const run = await options.pool.query<RecommendationRunRow>(
        `select
          id,
          profile_snapshot_id,
          kind,
          algorithm_version,
          weights_version,
          source_data_versions_json,
          input_hash,
          output_hash,
          created_at
        from recommendation.recommendation_runs
        where id = $1 and status = 'completed'`,
        [recommendationId],
      );
      const row = run.rows[0];
      if (!row) {
        return undefined;
      }

      const items = await options.pool.query<RecommendationItemRow>(
        `select
          item.id,
          item.career_id,
          item.pathway_id,
          item.stream_option_id,
          item.college_id,
          item.aid_scheme_id,
          item.rank,
          item.fit_score,
          item.likelihood_label,
          item.fit_explanation_json,
          item.entity_snapshot_json,
          item.entity_dataset_version,
          ring.ring_code
        from recommendation.recommendation_items item
        left join recommendation.recommendation_rings ring on ring.id = item.ring_id
        where item.recommendation_run_id = $1
        order by item.rank asc`,
        [recommendationId],
      );

      const recommendationItems = items.rows.map((item) => {
        const entityType = resolveEntityType(item, row.kind);
        const entityId = resolveEntityId(item);
        return {
          itemId: item.entity_snapshot_json?.itemId ?? `${entityType}:${entityId}`,
          entityType,
          entityId,
          title: item.entity_snapshot_json?.title ?? entityId,
          rank: item.rank,
          ...(item.fit_score === null ? {} : { fitScore: Number(item.fit_score) }),
          ...(item.ring_code ? { ring: item.ring_code } : {}),
          explanation: item.fit_explanation_json,
          entityDatasetVersion: item.entity_dataset_version,
        };
      });

      const ringedItems = recommendationItems.filter((item) => item.ring);
      const rings =
        ringedItems.length === 0
          ? undefined
          : {
              inner: recommendationItems.filter((item) => item.ring === "inner"),
              middle: recommendationItems.filter((item) => item.ring === "middle"),
              outer: recommendationItems.filter((item) => item.ring === "outer"),
            };

      return {
        recommendationId: row.id,
        profileSnapshotId: row.profile_snapshot_id,
        kind: row.kind,
        items: recommendationItems,
        ...(rings ? { rings } : {}),
        algorithmVersion: row.algorithm_version,
        weightsVersion: row.weights_version,
        sourceDataVersions: row.source_data_versions_json,
        inputHash: row.input_hash,
        outputHash: row.output_hash,
        createdAt:
          typeof row.created_at === "string"
            ? new Date(row.created_at).toISOString()
            : row.created_at.toISOString(),
      };
    },

    async findByInputHash(profileSnapshotId, kind, inputHash) {
      const result = await options.pool.query<{ id: string }>(
        `select id
        from recommendation.recommendation_runs
        where profile_snapshot_id = $1
          and kind = $2
          and input_hash = $3
          and status = 'completed'
        order by completed_at desc nulls last, created_at desc
        limit 1`,
        [profileSnapshotId, kind, inputHash],
      );
      const recommendationId = result.rows[0]?.id;
      if (!recommendationId) {
        return undefined;
      }

      return createPostgresRecommendationStore(options).findById(recommendationId);
    },

    clear() {
      return Promise.reject(
        new Error("Clearing the persistent recommendation store is not supported"),
      );
    },
  };
}

async function resolveConfigurationId(client: PoolClient, set: RecommendationSet): Promise<string> {
  const byVersion = await client.query<{ id: string }>(
    `select id
     from recommendation.matching_configurations
     where algorithm_version = $1 and version = $2
     order by status = 'active' desc, approved_at desc nulls last, created_at desc
     limit 1`,
    [set.algorithmVersion, set.weightsVersion],
  );
  const versionMatch = byVersion.rows[0]?.id;
  if (versionMatch) {
    return versionMatch;
  }

  const byAlgorithm = await client.query<{ id: string }>(
    `select id
     from recommendation.matching_configurations
     where algorithm_version = $1
     order by status = 'active' desc, approved_at desc nulls last, created_at desc
     limit 1`,
    [set.algorithmVersion],
  );
  const algorithmMatch = byAlgorithm.rows[0]?.id;
  if (algorithmMatch) {
    return algorithmMatch;
  }

  throw new Error(
    `No matching configuration found for ${set.algorithmVersion}/${set.weightsVersion}`,
  );
}

async function insertRings(
  client: PoolClient,
  set: RecommendationSet,
): Promise<Map<"inner" | "middle" | "outer", string>> {
  const ringIds = new Map<"inner" | "middle" | "outer", string>();
  if (!set.rings) {
    return ringIds;
  }

  const rings = [
    ["inner", 1],
    ["middle", 2],
    ["outer", 3],
  ] as const;
  for (const [ringCode, displayOrder] of rings) {
    const id = randomUUID();
    ringIds.set(ringCode, id);
    await client.query(
      `insert into recommendation.recommendation_rings (
        id,
        recommendation_run_id,
        ring_code,
        display_order,
        rule_version,
        reason_template_key
      ) values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        set.recommendationId,
        ringCode,
        displayOrder,
        set.algorithmVersion,
        `${set.kind}_${ringCode}`,
      ],
    );
  }

  return ringIds;
}

async function insertItems(
  client: PoolClient,
  set: RecommendationSet,
  ringIds: Map<"inner" | "middle" | "outer", string>,
): Promise<void> {
  for (const item of set.items) {
    await client.query(
      `insert into recommendation.recommendation_items (
        id,
        recommendation_run_id,
        ring_id,
        career_id,
        pathway_id,
        stream_option_id,
        college_id,
        aid_scheme_id,
        rank,
        fit_score,
        interest_fit,
        values_fit,
        feasibility_score,
        context_boost,
        likelihood_label,
        fit_explanation_json,
        ring_reason_key,
        entity_snapshot_json,
        entity_dataset_version,
        created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        randomUUID(),
        set.recommendationId,
        item.ring ? ringIds.get(item.ring) : null,
        item.entityType === "career" ? item.entityId : null,
        item.entityType === "pathway" ? item.entityId : null,
        item.entityType === "stream" ? item.entityId : null,
        item.entityType === "college" ? item.entityId : null,
        item.entityType === "aid" ? item.entityId : null,
        item.rank,
        item.fitScore ?? null,
        readNumericExplanation(item.explanation as Record<string, unknown>, "interestFit"),
        readNumericExplanation(item.explanation as Record<string, unknown>, "valuesFit"),
        readNumericExplanation(item.explanation as Record<string, unknown>, "feasibility"),
        readNumericExplanation(item.explanation as Record<string, unknown>, "contextBoost"),
        readStringExplanation(item.explanation as Record<string, unknown>, "likelihoodLabel"),
        JSON.stringify(item.explanation),
        item.ring ? `${set.kind}_${item.ring}` : null,
        JSON.stringify({
          itemId: item.itemId,
          entityType: item.entityType,
          title: item.title,
        }),
        item.entityDatasetVersion,
        set.createdAt,
      ],
    );
  }
}

function readNumericExplanation(explanation: Record<string, unknown>, key: string): number | null {
  const value = explanation[key];
  return typeof value === "number" ? value : null;
}

function readStringExplanation(explanation: Record<string, unknown>, key: string): string | null {
  const value = explanation[key];
  return typeof value === "string" ? value : null;
}

function resolveEntityType(
  item: RecommendationItemRow,
  kind: RecommendationSet["kind"],
): "career" | "stream" | "pathway" | "college" | "aid" | "plan" {
  if (item.career_id) return "career";
  if (item.pathway_id) return "pathway";
  if (item.stream_option_id) return "stream";
  if (item.college_id) return "college";
  if (item.aid_scheme_id) return "aid";
  return item.entity_snapshot_json?.entityType === "plan" ? "plan" : kind;
}

function resolveEntityId(item: RecommendationItemRow): string {
  return (
    item.career_id ??
    item.pathway_id ??
    item.stream_option_id ??
    item.college_id ??
    item.aid_scheme_id ??
    item.entity_snapshot_json?.itemId ??
    item.id
  );
}

async function insertGeneratedPlan(
  client: PoolClient,
  set: RecommendationSet,
  userId: string,
): Promise<void> {
  const planItem = set.items.find((item) => item.entityType === "plan");
  if (!planItem) {
    return;
  }

  const explanation = planItem.explanation as Record<string, unknown>;
  const targetEntityType = readStringExplanation(explanation, "targetEntityType");
  const targetEntityId = readStringExplanation(explanation, "targetEntityId");
  const version = await client.query<{ next_version: number }>(
    `select coalesce(max(plan_version), 0) + 1 as next_version
     from recommendation.generated_plans
     where user_id = $1 and target_entity_type is not distinct from $2`,
    [userId, targetEntityType],
  );
  const generatedPlanId = randomUUID();

  await client.query(
    `insert into recommendation.generated_plans (
      id,
      user_id,
      profile_snapshot_id,
      recommendation_run_id,
      plan_template_id,
      plan_version,
      target_entity_type,
      target_entity_id,
      input_hash,
      output_hash,
      created_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      generatedPlanId,
      userId,
      set.profileSnapshotId,
      set.recommendationId,
      planItem.entityId,
      version.rows[0]?.next_version ?? 1,
      targetEntityType,
      targetEntityId,
      set.inputHash,
      set.outputHash,
      set.createdAt,
    ],
  );

  const steps = explanation.generatedSteps;
  if (!Array.isArray(steps)) {
    return;
  }

  for (const step of steps) {
    if (!isGeneratedStep(step)) {
      continue;
    }

    const templateStep = await client.query<{ id: string }>(
      `select id
       from recommendation.plan_template_steps
       where plan_template_id = $1 and step_order = $2
       limit 1`,
      [planItem.entityId, step.stepOrder],
    );
    const sourceTemplateStepId = templateStep.rows[0]?.id;
    if (!sourceTemplateStepId) {
      continue;
    }

    await client.query(
      `insert into recommendation.generated_plan_steps (
        id,
        generated_plan_id,
        source_template_step_id,
        step_order,
        time_window,
        action_text,
        action_metadata_json
      ) values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        generatedPlanId,
        sourceTemplateStepId,
        step.stepOrder,
        step.timeWindow,
        step.actionText,
        JSON.stringify({ isOptional: step.isOptional }),
      ],
    );
  }
}

function isGeneratedStep(value: unknown): value is {
  stepOrder: number;
  timeWindow: string;
  actionText: string;
  isOptional: boolean;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const step = value as Record<string, unknown>;
  return (
    typeof step.stepOrder === "number" &&
    typeof step.timeWindow === "string" &&
    typeof step.actionText === "string" &&
    typeof step.isOptional === "boolean"
  );
}
