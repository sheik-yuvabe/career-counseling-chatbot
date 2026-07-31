import { describe, expect, it } from "vitest";
import type {
  CareerCatalogRecord,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
} from "@yuvanext/contracts";
import {
  buildCareerRecommendationSet,
  normalizeRiasecVector,
  partitionCareerRings,
  pearsonCorrelation,
  scoreCareers,
} from "./career-matching.js";

const routeId = "00000000-0000-4000-8000-000000000001";
const createdAt = "2026-07-28T00:00:00.000Z";

const config: MatchingConfig = {
  algorithmVersion: "career-fit-v1",
  weightsVersion: "weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000000100",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
  workValues: { R: 1, I: 9, A: 8, S: 5, E: 3, C: 2 },
};

const careers: CareerCatalogRecord[] = [
  {
    careerId: "00000000-0000-4000-8000-000000000201",
    title: "Data Scientist",
    riasec: { R: 2, I: 10, A: 7, S: 4, E: 3, C: 1 },
    workValues: { R: 1, I: 9, A: 8, S: 5, E: 3, C: 2 },
    routeIds: [routeId],
    datasetVersion: "careers-2026-a",
    verified: true,
    isVocationalRoute: false,
  },
  {
    careerId: "00000000-0000-4000-8000-000000000202",
    title: "Graphic Designer",
    riasec: { R: 1, I: 4, A: 10, S: 5, E: 4, C: 2 },
    workValues: { R: 1, I: 4, A: 9, S: 5, E: 5, C: 2 },
    routeIds: [routeId],
    datasetVersion: "careers-2026-a",
    verified: true,
    isVocationalRoute: false,
  },
  {
    careerId: "00000000-0000-4000-8000-000000000203",
    title: "Operations Clerk",
    riasec: { R: 2, I: 1, A: 1, S: 3, E: 4, C: 10 },
    workValues: { R: 2, I: 1, A: 1, S: 4, E: 4, C: 10 },
    routeIds: [routeId],
    datasetVersion: "careers-2026-a",
    verified: true,
    isVocationalRoute: true,
  },
];

describe("career matching", () => {
  it("normalizes RIASEC vectors to a 0-1 range", () => {
    expect(normalizeRiasecVector({ R: 2, I: 10, A: 6, S: 4, E: 2, C: 0 })).toEqual({
      R: 0.2,
      I: 1,
      A: 0.6,
      S: 0.4,
      E: 0.2,
      C: 0,
    });
  });

  it("returns neutral correlation for zero-variance vectors", () => {
    expect(
      pearsonCorrelation(
        { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 },
        { R: 5, I: 4, A: 3, S: 2, E: 1, C: 0 },
      ),
    ).toBe(0);
  });

  it("ranks careers by deterministic fit score", () => {
    const items = scoreCareers({
      recommendationId: "rec-1",
      profile,
      careers,
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual([
      "Data Scientist",
      "Graphic Designer",
      "Operations Clerk",
    ]);
    expect(items[0]?.rank).toBe(1);
    expect(items[0]?.fitScore).toBeGreaterThan(items[1]?.fitScore ?? 0);
  });

  it("redistributes missing values weight into interest weight", () => {
    const [item] = scoreCareers({
      recommendationId: "rec-1",
      profile: { ...profile, workValues: undefined },
      careers: [{ ...careers[0]!, workValues: undefined }],
      config,
      createdAt,
    });

    expect(item?.explanation.weights).toEqual({
      interest: 0.7,
      values: 0,
      feasibility: 0.15,
      context: 0.15,
    });
    expect(item?.explanation.valuesFit).toBeUndefined();
  });

  it("sorts exact score ties by normalized title", () => {
    const tiedCareers: CareerCatalogRecord[] = [
      { ...careers[0]!, careerId: "00000000-0000-4000-8000-000000000301", title: "zeta role" },
      { ...careers[0]!, careerId: "00000000-0000-4000-8000-000000000302", title: "Alpha Role" },
    ];

    const items = scoreCareers({
      recommendationId: "rec-1",
      profile,
      careers: tiedCareers,
      config,
      createdAt,
    });

    expect(items.map((item) => item.title)).toEqual(["Alpha Role", "zeta role"]);
  });

  it("sorts exact score and title ties by stable entity ID", () => {
    const tiedCareers: CareerCatalogRecord[] = [
      { ...careers[0]!, careerId: "00000000-0000-4000-8000-000000000402", title: "Same Role" },
      { ...careers[0]!, careerId: "00000000-0000-4000-8000-000000000401", title: "Same Role" },
    ];

    const items = scoreCareers({
      recommendationId: "rec-1",
      profile,
      careers: tiedCareers,
      config,
      createdAt,
    });

    expect(items.map((item) => item.entityId)).toEqual([
      "00000000-0000-4000-8000-000000000401",
      "00000000-0000-4000-8000-000000000402",
    ]);
  });

  it("produces the same output hash when input careers arrive in a different order", () => {
    const first = buildCareerRecommendationSet({
      recommendationId: "rec-1",
      profile,
      careers,
      config,
      createdAt,
    });
    const second = buildCareerRecommendationSet({
      recommendationId: "rec-1",
      profile,
      careers: [...careers].reverse(),
      config,
      createdAt,
    });

    expect(second.items.map((item) => item.entityId)).toEqual(first.items.map((item) => item.entityId));
    expect(second.outputHash).toBe(first.outputHash);
  });

  it("partitions careers into deterministic RIASEC rings", () => {
    const ringCareers = makeRingCareers().map((item) => ({
      ...item,
      isVocationalRoute: false,
    }));
    const scored = scoreCareers({
      recommendationId: "rec-1",
      profile,
      careers: ringCareers,
      config,
      createdAt,
    });

    const rings = partitionCareerRings(scored, profile, ringCareers, config);

    expect(rings.inner).toHaveLength(4);
    expect(rings.middle).toHaveLength(6);
    expect(rings.outer).toHaveLength(6);
    expect(rings.inner.every((item) => item.ring === "inner")).toBe(true);
    expect(rings.middle.every((item) => item.ring === "middle")).toBe(true);
    expect(rings.outer.every((item) => item.ring === "outer")).toBe(true);
    expect(rings.inner.every((item) => item.explanation.topMatchingScales.includes("I"))).toBe(true);
    expect(rings.middle.every((item) => ["R", "A"].includes(item.explanation.topMatchingScales[0] ?? ""))).toBe(true);
  });

  it("includes a vocational career in the outer ring when one is available", () => {
    const ringCareers = makeRingCareers();
    const set = buildCareerRecommendationSet({
      recommendationId: "rec-1",
      profile,
      careers: ringCareers,
      config,
      createdAt,
    });

    expect(set.rings?.outer.some((item) => item.title === "Vocational Technician")).toBe(true);
    expect(set.items.every((item) => item.ring !== undefined)).toBe(true);
  });
});

function makeRingCareers(): CareerCatalogRecord[] {
  return [
    career("00000000-0000-4000-8000-000000000401", "Investigative Analyst", "I", false),
    career("00000000-0000-4000-8000-000000000402", "Research Associate", "I", false),
    career("00000000-0000-4000-8000-000000000403", "Lab Planner", "I", false),
    career("00000000-0000-4000-8000-000000000404", "Data Modeler", "I", false),
    career("00000000-0000-4000-8000-000000000405", "UX Artist", "A", false),
    career("00000000-0000-4000-8000-000000000406", "Design Researcher", "A", false),
    career("00000000-0000-4000-8000-000000000407", "Creative Technologist", "A", false),
    career("00000000-0000-4000-8000-000000000408", "Field Engineer", "R", false),
    career("00000000-0000-4000-8000-000000000409", "Robotics Helper", "R", false),
    career("00000000-0000-4000-8000-000000000410", "Vocational Technician", "R", true),
    career("00000000-0000-4000-8000-000000000411", "Community Coordinator", "S", false),
    career("00000000-0000-4000-8000-000000000412", "Program Promoter", "E", false),
    career("00000000-0000-4000-8000-000000000413", "Accounts Assistant", "C", false),
    career("00000000-0000-4000-8000-000000000414", "Library Assistant", "C", false),
    career("00000000-0000-4000-8000-000000000415", "Training Facilitator", "S", false),
    career("00000000-0000-4000-8000-000000000416", "Sales Trainee", "E", false),
  ];
}

function career(
  careerId: string,
  title: string,
  topLetter: "R" | "I" | "A" | "S" | "E" | "C",
  isVocationalRoute: boolean,
): CareerCatalogRecord {
  const base = { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 };
  const riasec = { ...base, [topLetter]: 10 };

  return {
    careerId,
    title,
    riasec,
    workValues: riasec,
    routeIds: [routeId],
    datasetVersion: "careers-2026-a",
    verified: true,
    isVocationalRoute,
  };
}
