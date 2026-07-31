import { describe, expect, it } from "vitest";
import type {
  AidSchemeCatalogRecord,
  CareerCatalogRecord,
  CollegeCatalogRecord,
  MatchingConfig,
  PathwayCatalogRecord,
  PlanTemplateCatalogRecord,
  ProfileSnapshotForRecommendations,
  StreamCatalogRecord,
} from "@yuvanext/contracts";
import { createRecommendationService } from "./recommendation-service.js";

const createdAt = "2026-07-28T00:00:00.000Z";
const routeId = "00000000-0000-4000-8000-000000005001";
const careerId = "00000000-0000-4000-8000-000000005101";
const streamId = "00000000-0000-4000-8000-000000005201";
const pathwayId = "00000000-0000-4000-8000-000000005301";
const disciplineId = "00000000-0000-4000-8000-000000005401";

const config: MatchingConfig = {
  algorithmVersion: "mvp-flow-v1",
  weightsVersion: "mvp-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000005000",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const careers: CareerCatalogRecord[] = [
  {
    careerId,
    title: "Data Scientist",
    riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
    routeIds: [routeId],
    datasetVersion: "careers-2026-a",
    verified: true,
    isVocationalRoute: false,
  },
];

const streams: StreamCatalogRecord[] = [
  {
    streamId,
    title: "Science with Computer Science",
    riasecLetters: ["I", "A"],
    recommendedSegments: ["pathfinder"],
    marksBands: ["high"],
    priority: 1,
    datasetVersion: "streams-2026-a",
    verified: true,
  },
];

const pathways: PathwayCatalogRecord[] = [
  {
    pathwayId,
    title: "BSc Computer Science",
    careerIds: [careerId],
    streamIds: [streamId],
    recommendedSegments: ["pathfinder"],
    marksBands: ["high"],
    reachability: 1,
    hasBackupRoute: true,
    priority: 1,
    datasetVersion: "pathways-2026-a",
    verified: true,
  },
];

const colleges: CollegeCatalogRecord[] = [
  {
    collegeId: "00000000-0000-4000-8000-000000005501",
    title: "Chennai Science College",
    disciplineIds: [disciplineId],
    state: "Tamil Nadu",
    tier: 1,
    collegeType: "regular",
    datasetVersion: "colleges-2026-a",
    verified: true,
  },
];

const aidSchemes: AidSchemeCatalogRecord[] = [
  {
    aidSchemeId: "00000000-0000-4000-8000-000000005601",
    title: "State Merit Scholarship",
    criteria: [
      { factKey: "state", acceptedValues: ["Tamil Nadu"] },
      { factKey: "marksBand", acceptedValues: ["high"] },
    ],
    priority: 1,
    datasetVersion: "aid-2026-a",
    verified: true,
  },
];

const templates: PlanTemplateCatalogRecord[] = [
  {
    planTemplateId: "00000000-0000-4000-8000-000000005701",
    title: "Pathfinder Route Plan",
    segment: "pathfinder",
    planType: "pathway",
    targetEntityType: "pathway",
    priority: 1,
    steps: [
      {
        stepOrder: 1,
        timeWindow: "Week 1",
        actionTemplate: "Compare entry routes for {{targetTitle}}.",
        isOptional: false,
      },
    ],
    datasetVersion: "plan-templates-2026-a",
    verified: true,
  },
];

describe("recommendation service", () => {
  it("orchestrates the MVP deterministic recommendation flow", () => {
    const service = createRecommendationService();
    const careerSet = service.recommendCareers({
      recommendationId: "career-rec-1",
      profile,
      careers,
      config,
      createdAt,
    });
    const streamSet = service.recommendStreams({
      recommendationId: "stream-rec-1",
      profile,
      streams,
      config,
      createdAt,
    });
    const pathwaySet = service.recommendPathways({
      recommendationId: "pathway-rec-1",
      profile,
      pathways,
      rankedCareerIds: careerSet.items.map((item) => item.entityId),
      rankedStreamIds: streamSet.items.map((item) => item.entityId),
      config,
      createdAt,
    });
    const collegeSet = service.recommendColleges({
      recommendationId: "college-rec-1",
      profile,
      colleges,
      targetDisciplineIds: [disciplineId],
      selectedState: "Tamil Nadu",
      config,
      createdAt,
    });
    const aidSet = service.recommendAid({
      recommendationId: "aid-rec-1",
      profile,
      aidSchemes,
      storedFacts: { state: "Tamil Nadu", marksBand: "high" },
      config,
      createdAt,
    });
    const planSet = service.generatePlan({
      recommendationId: "plan-rec-1",
      profile,
      templates,
      target: {
        entityType: "pathway",
        entityId: pathwayId,
        title: "BSc Computer Science",
      },
      config,
      createdAt,
    });

    expect(careerSet.kind).toBe("career");
    expect(streamSet.kind).toBe("stream");
    expect(pathwaySet.kind).toBe("pathway");
    expect(collegeSet.kind).toBe("college");
    expect(aidSet.kind).toBe("aid");
    expect(planSet.kind).toBe("plan");
    expect(pathwaySet.items[0]?.entityId).toBe(pathwayId);
    expect(planSet.items[0]?.title).toBe("Pathfinder Route Plan");
  });

  it("stores completed sets immutably and replays the saved output hash", () => {
    const service = createRecommendationService();
    const careerSet = service.recommendCareers({
      recommendationId: "career-rec-replay",
      profile,
      careers,
      config,
      createdAt,
    });
    const stored = service.getRecommendation("career-rec-replay");
    const replay = service.replayRecommendation("career-rec-replay", createdAt);

    expect(stored?.outputHash).toBe(careerSet.outputHash);
    expect(replay).toMatchObject({
      recommendationId: "career-rec-replay",
      originalOutputHash: careerSet.outputHash,
      replayOutputHash: careerSet.outputHash,
      matches: true,
    });
  });

  it("rejects recalculation with an existing recommendation id", () => {
    const service = createRecommendationService();
    const request = {
      recommendationId: "career-rec-immutable",
      profile,
      careers,
      config,
      createdAt,
    };

    service.recommendCareers(request);
    expect(() => service.recommendCareers(request)).toThrow(/already exists/);
  });
});
