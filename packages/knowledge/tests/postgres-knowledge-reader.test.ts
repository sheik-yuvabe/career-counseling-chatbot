import { describe, expect, it, vi } from "vitest";
import { PostgresKnowledgeReader } from "../src/index.js";

type ReaderPool = ConstructorParameters<typeof PostgresKnowledgeReader>[0];

const careerId = "00000000-0000-4000-8000-000000000301";
const profileSnapshotId = "00000000-0000-4000-8000-000000000302";
const recommendationId = "00000000-0000-4000-8000-000000000303";

const createReader = (rows: unknown[]) => {
  const query = vi.fn(() => Promise.resolve({ rows }));
  return {
    query,
    reader: new PostgresKnowledgeReader({ query } as unknown as ReaderPool),
  };
};

describe("PostgresKnowledgeReader", () => {
  it("returns a published career with dataset and source provenance", async () => {
    const { query, reader } = createReader([
      {
        id: careerId,
        title: "Synthetic Career",
        entity_type: "career",
        status: "published",
        dataset_key: "careers",
        dataset_version: "2026-a",
        source_ref: "https://source.example/careers",
        entity_ref: null,
        last_verified_at: "2026-08-01T00:00:00.000Z",
      },
    ]);

    const result = await reader.getCareer({ entityId: careerId });
    expect(result).toMatchObject({
      queryType: "career_by_id",
      entities: [
        {
          id: careerId,
          entityType: "career",
          title: "Synthetic Career",
          status: "published",
          datasetVersion: "2026-a",
          sourceRefs: ["https://source.example/careers"],
          lastVerifiedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      sourceVersions: { careers: "2026-a" },
    });
    expect(Number.isNaN(Date.parse(result.retrievedAt))).toBe(false);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("c.publication_status in ('published', 'retired')"),
      [careerId],
    );
  });

  it("loads verified colleges by recommended entity IDs in recommendation order", async () => {
    const secondId = "00000000-0000-4000-8000-000000000304";
    const { query, reader } = createReader([]);

    await reader.getColleges({
      entityIds: [careerId, secondId],
      profileSnapshotId,
      recommendationId,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("college.verification_status = 'verified'"),
      [[careerId, secondId]],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("array_position($1::uuid[], college.id)"),
      [[careerId, secondId]],
    );
  });

  it("loads streams only through published mappings", async () => {
    const { query, reader } = createReader([]);

    await reader.getStreams({ entityIds: [careerId], profileSnapshotId, recommendationId });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("map.status = 'published'"),
      [[careerId]],
    );
  });

  it("does not query when the recommendation contains no entity IDs", async () => {
    const { query, reader } = createReader([]);

    await expect(
      reader.getAidSchemes({ entityIds: [], profileSnapshotId, recommendationId }),
    ).resolves.toMatchObject({ queryType: "aid_by_recommendation", entities: [] });
    expect(query).not.toHaveBeenCalled();
  });
});
