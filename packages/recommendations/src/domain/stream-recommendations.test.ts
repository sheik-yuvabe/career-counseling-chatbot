import { describe, expect, it } from "vitest";
import type {
  MatchingConfig,
  ProfileSnapshotForRecommendations,
  StreamCatalogRecord,
} from "@yuvanext/contracts";
import { buildStreamRecommendationSet, scoreStreams } from "./stream-recommendations.js";

const createdAt = "2026-07-28T00:00:00.000Z";

const config: MatchingConfig = {
  algorithmVersion: "stream-fit-v1",
  weightsVersion: "stream-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000000500",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "explorer",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const streams: StreamCatalogRecord[] = [
  {
    streamId: "00000000-0000-4000-8000-000000000601",
    title: "Science with Computer Science",
    riasecLetters: ["I", "A", "R", "C"],
    recommendedSegments: ["explorer", "pathfinder"],
    marksBands: ["high"],
    priority: 1,
    datasetVersion: "streams-2026-a",
    verified: true,
  },
  {
    streamId: "00000000-0000-4000-8000-000000000602",
    title: "Arts and Design",
    riasecLetters: ["A", "S"],
    recommendedSegments: ["explorer"],
    marksBands: ["medium", "high"],
    priority: 2,
    datasetVersion: "streams-2026-a",
    verified: true,
  },
  {
    streamId: "00000000-0000-4000-8000-000000000603",
    title: "Commerce",
    riasecLetters: ["E", "C"],
    recommendedSegments: ["pathfinder", "launcher"],
    marksBands: ["medium"],
    priority: 3,
    datasetVersion: "streams-2026-a",
    verified: true,
  },
];

describe("stream recommendations", () => {
  it("ranks streams using deterministic profile-to-catalog rules", () => {
    const items = scoreStreams({
      recommendationId: "stream-rec-1",
      profile,
      streams,
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual([
      "Science with Computer Science",
      "Arts and Design",
      "Commerce",
    ]);
    expect(items[0]?.entityType).toBe("stream");
    expect(items[0]?.explanation.matchedLetters).toEqual(["I", "A"]);
    expect(items[0]?.explanation.segmentFit).toBe(1);
    expect(items[0]?.explanation.marksFit).toBe(1);
  });

  it("uses a neutral marks fit when marks are unknown or unrestricted", () => {
    const [item] = scoreStreams({
      recommendationId: "stream-rec-1",
      profile: { ...profile, marksBand: undefined },
      streams: [{ ...streams[0]!, marksBands: undefined }],
      config,
      createdAt,
    });

    expect(item?.explanation.marksFit).toBe(0.5);
  });

  it("sorts exact stream ties by priority, title, then entity ID", () => {
    const tiedStreams: StreamCatalogRecord[] = [
      {
        ...streams[0]!,
        streamId: "00000000-0000-4000-8000-000000000702",
        title: "Same Stream",
        priority: 5,
      },
      {
        ...streams[0]!,
        streamId: "00000000-0000-4000-8000-000000000701",
        title: "Same Stream",
        priority: 5,
      },
    ];

    const items = scoreStreams({
      recommendationId: "stream-rec-1",
      profile,
      streams: tiedStreams,
      config,
      createdAt,
    });

    expect(items.map((item) => item.entityId)).toEqual([
      "00000000-0000-4000-8000-000000000701",
      "00000000-0000-4000-8000-000000000702",
    ]);
  });

  it("produces the same stream output hash when input order changes", () => {
    const first = buildStreamRecommendationSet({
      recommendationId: "stream-rec-1",
      profile,
      streams,
      config,
      createdAt,
    });
    const second = buildStreamRecommendationSet({
      recommendationId: "stream-rec-1",
      profile,
      streams: [...streams].reverse(),
      config,
      createdAt,
    });

    expect(second.kind).toBe("stream");
    expect(second.items.map((item) => item.entityId)).toEqual(first.items.map((item) => item.entityId));
    expect(second.outputHash).toBe(first.outputHash);
  });
});
