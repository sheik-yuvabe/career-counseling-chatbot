import { describe, expect, it } from "vitest";
import type {
  CollegeCatalogRecord,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
} from "@yuvanext/contracts";
import {
  buildCollegeRecommendationSet,
  partitionCollegeRings,
  scoreColleges,
} from "./college-recommendations.js";

const createdAt = "2026-07-28T00:00:00.000Z";
const disciplineA = "00000000-0000-4000-8000-000000002001";
const disciplineB = "00000000-0000-4000-8000-000000002002";
const disciplineC = "00000000-0000-4000-8000-000000002003";

const config: MatchingConfig = {
  algorithmVersion: "college-fit-v1",
  weightsVersion: "college-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000002100",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const colleges: CollegeCatalogRecord[] = [
  college("00000000-0000-4000-8000-000000002201", "Chennai Science College", [disciplineA, disciplineB], "Tamil Nadu", 1, "regular"),
  college("00000000-0000-4000-8000-000000002202", "Kochi Technology Institute", [disciplineA], "Kerala", 1, "regular"),
  college("00000000-0000-4000-8000-000000002203", "Bengaluru Open University", [disciplineA], "Karnataka", 2, "open_university"),
  college("00000000-0000-4000-8000-000000002204", "Hyderabad Commerce College", [disciplineC], "Telangana", 2, "regular"),
];

describe("college recommendations", () => {
  it("ranks colleges by discipline, tier, state proximity, access route, and title", () => {
    const items = scoreColleges({
      recommendationId: "college-rec-1",
      profile,
      colleges,
      targetDisciplineIds: [disciplineA, disciplineB],
      selectedState: "Tamil Nadu",
      neighboringStates: ["Kerala", "Karnataka"],
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual([
      "Chennai Science College",
      "Kochi Technology Institute",
      "Bengaluru Open University",
      "Hyderabad Commerce College",
    ]);
    expect(items[0]?.entityType).toBe("college");
    expect(items[0]?.explanation.matchedDisciplineIds).toEqual([disciplineA, disciplineB]);
    expect(items[0]?.explanation.stateBand).toBe("selected");
  });

  it("partitions colleges into deterministic rings", () => {
    const ringColleges = makeRingColleges();
    const scored = scoreColleges({
      recommendationId: "college-rec-1",
      profile,
      colleges: ringColleges,
      targetDisciplineIds: [disciplineA],
      selectedState: "Tamil Nadu",
      neighboringStates: ["Kerala", "Karnataka"],
      config,
      createdAt,
    });

    const rings = partitionCollegeRings(scored);

    expect(rings.inner).toHaveLength(4);
    expect(rings.middle).toHaveLength(6);
    expect(rings.outer).toHaveLength(6);
    expect(rings.inner.every((item) => item.ring === "inner")).toBe(true);
    expect(rings.middle.every((item) => item.ring === "middle")).toBe(true);
    expect(rings.outer.every((item) => item.ring === "outer")).toBe(true);
  });

  it("keeps an access-route college in the outer ring when available", () => {
    const set = buildCollegeRecommendationSet({
      recommendationId: "college-rec-1",
      profile,
      colleges: makeRingColleges(),
      targetDisciplineIds: [disciplineA],
      selectedState: "Tamil Nadu",
      neighboringStates: ["Kerala", "Karnataka"],
      config,
      createdAt,
    });

    const outerCollegeTypes =
      set.rings?.outer.map(
        (item) => (item.explanation as { collegeType?: string }).collegeType,
      ) ?? [];

    expect(
      outerCollegeTypes.some((collegeType) =>
        ["polytechnic", "iti", "open_university", "vocational"].includes(String(collegeType)),
      ),
    ).toBe(true);
    expect(set.items.every((item) => item.ring !== undefined)).toBe(true);
  });

  it("produces the same college output hash when catalog input order changes", () => {
    const first = buildCollegeRecommendationSet({
      recommendationId: "college-rec-1",
      profile,
      colleges,
      targetDisciplineIds: [disciplineA, disciplineB],
      selectedState: "Tamil Nadu",
      neighboringStates: ["Kerala", "Karnataka"],
      config,
      createdAt,
    });
    const second = buildCollegeRecommendationSet({
      recommendationId: "college-rec-1",
      profile,
      colleges: [...colleges].reverse(),
      targetDisciplineIds: [disciplineA, disciplineB],
      selectedState: "Tamil Nadu",
      neighboringStates: ["Kerala", "Karnataka"],
      config,
      createdAt,
    });

    expect(second.kind).toBe("college");
    expect(second.items.map((item) => item.entityId)).toEqual(first.items.map((item) => item.entityId));
    expect(second.outputHash).toBe(first.outputHash);
  });
});

function makeRingColleges(): CollegeCatalogRecord[] {
  return [
    college("00000000-0000-4000-8000-000000002301", "Tamil Nadu College 1", [disciplineA], "Tamil Nadu", 1, "regular"),
    college("00000000-0000-4000-8000-000000002302", "Tamil Nadu College 2", [disciplineA], "Tamil Nadu", 2, "regular"),
    college("00000000-0000-4000-8000-000000002303", "Tamil Nadu College 3", [disciplineA], "Tamil Nadu", 3, "regular"),
    college("00000000-0000-4000-8000-000000002304", "Tamil Nadu Polytechnic", [disciplineA], "Tamil Nadu", 4, "polytechnic"),
    college("00000000-0000-4000-8000-000000002305", "Kerala College 1", [disciplineA], "Kerala", 1, "regular"),
    college("00000000-0000-4000-8000-000000002306", "Kerala College 2", [disciplineA], "Kerala", 2, "regular"),
    college("00000000-0000-4000-8000-000000002307", "Kerala College 3", [disciplineA], "Kerala", 3, "regular"),
    college("00000000-0000-4000-8000-000000002308", "Karnataka College 1", [disciplineA], "Karnataka", 1, "regular"),
    college("00000000-0000-4000-8000-000000002309", "Karnataka College 2", [disciplineA], "Karnataka", 2, "regular"),
    college("00000000-0000-4000-8000-000000002310", "Karnataka Open University", [disciplineA], "Karnataka", 3, "open_university"),
    college("00000000-0000-4000-8000-000000002311", "Andhra College 1", [disciplineA], "Andhra Pradesh", 1, "regular"),
    college("00000000-0000-4000-8000-000000002312", "Andhra College 2", [disciplineA], "Andhra Pradesh", 2, "regular"),
    college("00000000-0000-4000-8000-000000002313", "Telangana College 1", [disciplineA], "Telangana", 1, "regular"),
    college("00000000-0000-4000-8000-000000002314", "Telangana ITI", [disciplineA], "Telangana", 4, "iti"),
    college("00000000-0000-4000-8000-000000002315", "Puducherry College", [disciplineA], "Puducherry", 2, "regular"),
    college("00000000-0000-4000-8000-000000002316", "Distance Access College", [disciplineA], "Delhi", 5, "open_university"),
  ];
}

function college(
  collegeId: string,
  title: string,
  disciplineIds: string[],
  state: string,
  tier: number,
  collegeType: CollegeCatalogRecord["collegeType"],
): CollegeCatalogRecord {
  return {
    collegeId,
    title,
    disciplineIds,
    state,
    tier,
    collegeType,
    datasetVersion: "colleges-2026-a",
    verified: true,
  };
}
