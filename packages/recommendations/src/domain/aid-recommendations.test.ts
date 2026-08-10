import { describe, expect, it } from "vitest";
import type {
  AidSchemeCatalogRecord,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
} from "@yuvanext/contracts";
import { buildAidRecommendationSet, scoreAidSchemes } from "./aid-recommendations.js";

const createdAt = "2026-07-28T00:00:00.000Z";

const config: MatchingConfig = {
  algorithmVersion: "aid-fit-v1",
  weightsVersion: "aid-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000003100",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const aidSchemes: AidSchemeCatalogRecord[] = [
  {
    aidSchemeId: "00000000-0000-4000-8000-000000003201",
    title: "State Merit Scholarship",
    criteria: [
      { factKey: "state", acceptedValues: ["Tamil Nadu"] },
      { factKey: "marksBand", acceptedValues: ["high"] },
    ],
    priority: 1,
    sourceUrl: "https://example.org/state-merit",
    datasetVersion: "aid-2026-a",
    verified: true,
  },
  {
    aidSchemeId: "00000000-0000-4000-8000-000000003202",
    title: "Income Support Scheme",
    criteria: [
      { factKey: "state", acceptedValues: ["Tamil Nadu"] },
      { factKey: "incomeBand", acceptedValues: ["low"] },
    ],
    priority: 2,
    datasetVersion: "aid-2026-a",
    verified: true,
  },
  {
    aidSchemeId: "00000000-0000-4000-8000-000000003203",
    title: "Neighbor State Aid",
    criteria: [{ factKey: "state", acceptedValues: ["Kerala"] }],
    priority: 3,
    datasetVersion: "aid-2026-a",
    verified: true,
  },
];

describe("aid recommendations", () => {
  it("labels schemes as likely, check_conditions, or explore from stored facts only", () => {
    const items = scoreAidSchemes({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high" },
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual([
      "State Merit Scholarship",
      "Income Support Scheme",
      "Neighbor State Aid",
    ]);
    expect(items[0]?.explanation.likelihoodLabel).toBe("likely");
    expect(items[1]?.explanation.likelihoodLabel).toBe("check_conditions");
    expect(items[1]?.explanation.unknownFactKeys).toEqual(["incomeBand"]);
    expect(items[2]?.explanation.likelihoodLabel).toBe("explore");
    expect(items[2]?.explanation.mismatchedFactKeys).toEqual(["state"]);
  });

  it("moves schemes outward when an otherwise matching required fact is unknown", () => {
    const comparisonSchemes: AidSchemeCatalogRecord[] = [
      aidSchemes[1]!,
      {
        aidSchemeId: "00000000-0000-4000-8000-000000003204",
        title: "Single Fact State Aid",
        criteria: [{ factKey: "state", acceptedValues: ["Tamil Nadu"] }],
        priority: 5,
        datasetVersion: "aid-2026-a",
        verified: true,
      },
    ];
    const withIncome = scoreAidSchemes({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes: comparisonSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high", incomeBand: "low" },
      config,
      createdAt,
    });
    const withoutIncome = scoreAidSchemes({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes: comparisonSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high" },
      config,
      createdAt,
    });

    expect(withIncome.find((item) => item.title === "Income Support Scheme")?.explanation.likelihoodLabel).toBe(
      "likely",
    );
    expect(withoutIncome.find((item) => item.title === "Income Support Scheme")?.explanation.likelihoodLabel).toBe(
      "check_conditions",
    );
    expect(withoutIncome.findIndex((item) => item.title === "Income Support Scheme")).toBeGreaterThan(
      withIncome.findIndex((item) => item.title === "Income Support Scheme"),
    );
  });

  it("does not infer missing facts from the profile snapshot", () => {
    const [item] = scoreAidSchemes({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes: [aidSchemes[0]!],
      storedFacts: { marksBand: "high" },
      config,
      createdAt,
    });

    expect(item?.explanation.likelihoodLabel).toBe("check_conditions");
    expect(item?.explanation.unknownFactKeys).toEqual(["state"]);
  });

  it("sorts exact aid ties by priority, title, then entity ID", () => {
    const tiedSchemes: AidSchemeCatalogRecord[] = [
      {
        ...aidSchemes[0]!,
        aidSchemeId: "00000000-0000-4000-8000-000000003302",
        title: "Same Aid",
        priority: 5,
      },
      {
        ...aidSchemes[0]!,
        aidSchemeId: "00000000-0000-4000-8000-000000003301",
        title: "Same Aid",
        priority: 5,
      },
    ];

    const items = scoreAidSchemes({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes: tiedSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high" },
      config,
      createdAt,
    });

    expect(items.map((item) => item.entityId)).toEqual([
      "00000000-0000-4000-8000-000000003301",
      "00000000-0000-4000-8000-000000003302",
    ]);
  });

  it("produces the same aid output hash when catalog and fact key order changes", () => {
    const first = buildAidRecommendationSet({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high", incomeBand: "low" },
      config,
      createdAt,
    });
    const second = buildAidRecommendationSet({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes: [...aidSchemes].reverse(),
      storedFacts: { incomeBand: "low", marksBand: "high", state: "Tamil Nadu" },
      config,
      createdAt,
    });

    expect(second.kind).toBe("aid");
    expect(second.items.map((item) => item.entityId)).toEqual(first.items.map((item) => item.entityId));
    expect(second.outputHash).toBe(first.outputHash);
  });
});
