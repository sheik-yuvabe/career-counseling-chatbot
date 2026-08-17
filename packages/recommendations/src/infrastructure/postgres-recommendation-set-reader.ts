import {
  RecommendationSetSchema,
  UuidSchema,
  type RecommendationItem,
  type RecommendationSet,
} from "@yuvanext/contracts";
import type { createDatabasePool } from "@yuvanext/database";
import type {
  ReadRecommendationSetInput,
  RecommendationSetReader,
} from "../application/recommendation-set-reader.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

type RecommendationRow = {
  recommendation_id: string;
  profile_snapshot_id: string;
  kind: string;
  algorithm_version: string;
  weights_version: string;
  source_data_versions_json: unknown;
  input_hash: string;
  output_hash: string;
  recommendation_created_at: string | Date;
  item_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  rank: number | null;
  fit_score: number | string | null;
  ring_code: string | null;
  fit_explanation_json: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const mapItem = (row: RecommendationRow): RecommendationItem | null => {
  if (!row.item_id || !row.entity_type || !row.entity_id || row.rank === null) {
    return null;
  }
  return {
    itemId: row.item_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    rank: row.rank,
    ...(row.fit_score === null ? {} : { fitScore: Number(row.fit_score) }),
    ...(row.ring_code ? { ring: row.ring_code as RecommendationItem["ring"] } : {}),
    explanation: asRecord(row.fit_explanation_json),
  };
};

export class PostgresRecommendationSetReader implements RecommendationSetReader {
  constructor(private readonly pool: DatabasePool) {}

  async getRecommendationSet(input: ReadRecommendationSetInput): Promise<RecommendationSet | null> {
    const recommendationId = input.recommendationId
      ? UuidSchema.parse(input.recommendationId)
      : null;
    const profileSnapshotId = input.profileSnapshotId
      ? UuidSchema.parse(input.profileSnapshotId)
      : null;
    const userId = UuidSchema.parse(input.userId);
    const result = await this.pool.query<RecommendationRow>(
      `select
        r.id as recommendation_id,
        r.profile_snapshot_id,
        r.kind,
        r.algorithm_version,
        r.weights_version,
        r.source_data_versions_json,
        r.input_hash,
        r.output_hash,
        r.created_at as recommendation_created_at,
        i.id as item_id,
        case
          when i.career_id is not null then 'career'
          when i.pathway_id is not null then 'pathway'
          when i.stream_option_id is not null then 'stream'
          when i.college_id is not null then 'college'
          when i.aid_scheme_id is not null then 'aid'
        end as entity_type,
        coalesce(i.career_id, i.pathway_id, i.stream_option_id, i.college_id, i.aid_scheme_id)
          as entity_id,
        i.rank,
        i.fit_score,
        rings.ring_code,
        i.fit_explanation_json
      from (
        select *
        from recommendation.recommendation_runs
        where ($1::uuid is null or id = $1)
          and user_id = $2
          and ($3::uuid is null or profile_snapshot_id = $3)
          and status = 'completed'
        order by created_at desc
        limit 1
      ) r
      left join recommendation.recommendation_items i
        on i.recommendation_run_id = r.id
      left join recommendation.recommendation_rings rings
        on rings.id = i.ring_id
      order by i.rank asc nulls last`,
      [recommendationId, userId, profileSnapshotId],
    );
    const first = result.rows[0];
    if (!first) {
      return null;
    }
    const items = result.rows
      .map((row) => mapItem(row))
      .filter((item): item is RecommendationItem => item !== null);

    return RecommendationSetSchema.parse({
      recommendationId: first.recommendation_id,
      profileSnapshotId: first.profile_snapshot_id,
      kind: first.kind,
      items,
      algorithmVersion: first.algorithm_version,
      weightsVersion: first.weights_version,
      sourceDataVersions: asRecord(first.source_data_versions_json),
      inputHash: first.input_hash,
      outputHash: first.output_hash,
      createdAt: new Date(first.recommendation_created_at).toISOString(),
    });
  }
}
