import { validProfileSnapshot, validRecommendationSet } from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { PostgresRecommendationSetReader } from "../src/index.js";

type ReaderPool = ConstructorParameters<typeof PostgresRecommendationSetReader>[0];

const item = validRecommendationSet.items[0];
if (!item) {
  throw new Error("The recommendation fixture must include an item");
}

const row = {
  recommendation_id: validRecommendationSet.recommendationId,
  profile_snapshot_id: validRecommendationSet.profileSnapshotId,
  kind: validRecommendationSet.kind,
  algorithm_version: validRecommendationSet.algorithmVersion,
  weights_version: validRecommendationSet.weightsVersion,
  source_data_versions_json: validRecommendationSet.sourceDataVersions,
  input_hash: validRecommendationSet.inputHash,
  output_hash: validRecommendationSet.outputHash,
  recommendation_created_at: validRecommendationSet.createdAt,
  item_id: item.itemId,
  entity_type: item.entityType,
  entity_id: item.entityId,
  rank: item.rank,
  fit_score: String(item.fitScore),
  ring_code: item.ring,
  fit_explanation_json: item.explanation,
};

const createReader = (rows: unknown[]) => {
  const query = vi.fn((sql: string, parameters?: readonly unknown[]) => {
    void sql;
    void parameters;
    return Promise.resolve({ rows });
  });
  return {
    query,
    reader: new PostgresRecommendationSetReader({ query } as unknown as ReaderPool),
  };
};

describe("PostgresRecommendationSetReader", () => {
  it("maps a completed owned run and its ordered items", async () => {
    const { query, reader } = createReader([row]);

    await expect(
      reader.getRecommendationSet({
        userId: validProfileSnapshot.userId,
        recommendationId: validRecommendationSet.recommendationId,
      }),
    ).resolves.toEqual(validRecommendationSet);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("and user_id = $2"), [
      validRecommendationSet.recommendationId,
      validProfileSnapshot.userId,
      null,
    ]);
    expect(String(query.mock.calls[0]?.[0])).toContain("status = 'completed'");
    expect(String(query.mock.calls[0]?.[0])).toContain("order by i.rank asc");
  });

  it("selects the latest completed owned run for a profile", async () => {
    const { query, reader } = createReader([row]);

    await expect(
      reader.getRecommendationSet({
        userId: validProfileSnapshot.userId,
        profileSnapshotId: validProfileSnapshot.snapshotId,
      }),
    ).resolves.toEqual(validRecommendationSet);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("order by created_at desc"), [
      null,
      validProfileSnapshot.userId,
      validProfileSnapshot.snapshotId,
    ]);
  });

  it("returns null when no owned completed run exists", async () => {
    const { reader } = createReader([]);

    await expect(
      reader.getRecommendationSet({
        userId: validProfileSnapshot.userId,
        recommendationId: validRecommendationSet.recommendationId,
      }),
    ).resolves.toBeNull();
  });
});
