import { describe, expect, it } from "vitest";
import type {
  MatchingConfig,
  PathwayCatalogRecord,
  ProfileSnapshotForRecommendations,
} from "@yuvanext/contracts";
import { buildPathwayRecommendationSet, scorePathways } from "./pathway-recommendations.js";

const createdAt = "2026-07-28T00:00:00.000Z";
const careerA = "00000000-0000-4000-8000-000000000801";
const careerB = "00000000-0000-4000-8000-000000000802";
const careerC = "00000000-0000-4000-8000-000000000803";
const streamA = "00000000-0000-4000-8000-000000000901";
const streamB = "00000000-0000-4000-8000-000000000902";

const config: MatchingConfig = {
  algorithmVersion: "pathway-fit-v1",
  weightsVersion: "pathway-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000000700",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const pathways: PathwayCatalogRecord[] = [
  {
    pathwayId: "00000000-0000-4000-8000-000000001001",
    title: "BSc Computer Science",
    careerIds: [careerA, careerB],
    streamIds: [streamA],
    recommendedSegments: ["pathfinder", "launcher"],
    marksBands: ["high"],
    reachability: 0.9,
    hasBackupRoute: true,
    priority: 1,
    datasetVersion: "pathways-2026-a",
    verified: true,
  },
  {
    pathwayId: "00000000-0000-4000-8000-000000001002",
    title: "Design Diploma",
    careerIds: [careerB],
    streamIds: [streamB],
    recommendedSegments: ["explorer", "pathfinder"],
    marksBands: ["medium", "high"],
    reachability: 0.75,
    hasBackupRoute: true,
    priority: 2,
    datasetVersion: "pathways-2026-a",
    verified: true,
  },
  {
    pathwayId: "00000000-0000-4000-8000-000000001003",
    title: "Commerce Foundation",
    careerIds: [careerC],
    streamIds: [streamB],
    recommendedSegments: ["launcher"],
    marksBands: ["medium"],
    reachability: 0.6,
    hasBackupRoute: false,
    priority: 3,
    datasetVersion: "pathways-2026-a",
    verified: true,
  },
];

describe("pathway recommendations", () => {
  it("ranks pathways from deterministic career, stream, segment, marks, and reachability signals", () => {
    const items = scorePathways({
      recommendationId: "pathway-rec-1",
      profile,
      pathways,
      rankedCareerIds: [careerA, careerB, careerC],
      rankedStreamIds: [streamA, streamB],
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual([
      "BSc Computer Science",
      "Design Diploma",
      "Commerce Foundation",
    ]);
    expect(items[0]?.entityType).toBe("pathway");
    expect(items[0]?.explanation.matchedCareerIds).toEqual([careerA, careerB]);
    expect(items[0]?.explanation.matchedStreamIds).toEqual([streamA]);
    expect(items[0]?.explanation.segmentFit).toBe(1);
  });

  it("uses neutral marks fit when marks are unknown or unrestricted", () => {
    const [item] = scorePathways({
      recommendationId: "pathway-rec-1",
      profile: { ...profile, marksBand: undefined },
      pathways: [{ ...pathways[0]!, marksBands: undefined }],
      rankedCareerIds: [careerA],
      rankedStreamIds: [streamA],
      config,
      createdAt,
    });

    expect(item?.explanation.marksFit).toBe(0.5);
  });

  it("sorts exact pathway ties by reachability, priority, title, then entity ID", () => {
    const tiedPathways: PathwayCatalogRecord[] = [
      {
        ...pathways[0]!,
        pathwayId: "00000000-0000-4000-8000-000000001102",
        title: "Same Pathway",
        priority: 5,
      },
      {
        ...pathways[0]!,
        pathwayId: "00000000-0000-4000-8000-000000001101",
        title: "Same Pathway",
        priority: 5,
      },
    ];

    const items = scorePathways({
      recommendationId: "pathway-rec-1",
      profile,
      pathways: tiedPathways,
      rankedCareerIds: [careerA],
      rankedStreamIds: [streamA],
      config,
      createdAt,
    });

    expect(items.map((item) => item.entityId)).toEqual([
      "00000000-0000-4000-8000-000000001101",
      "00000000-0000-4000-8000-000000001102",
    ]);
  });

  it("produces the same pathway output hash when catalog input order changes", () => {
    const first = buildPathwayRecommendationSet({
      recommendationId: "pathway-rec-1",
      profile,
      pathways,
      rankedCareerIds: [careerA, careerB, careerC],
      rankedStreamIds: [streamA, streamB],
      config,
      createdAt,
    });
    const second = buildPathwayRecommendationSet({
      recommendationId: "pathway-rec-1",
      profile,
      pathways: [...pathways].reverse(),
      rankedCareerIds: [careerA, careerB, careerC],
      rankedStreamIds: [streamA, streamB],
      config,
      createdAt,
    });

    expect(second.kind).toBe("pathway");
    expect(second.items.map((item) => item.entityId)).toEqual(first.items.map((item) => item.entityId));
    expect(second.outputHash).toBe(first.outputHash);
  });
});
