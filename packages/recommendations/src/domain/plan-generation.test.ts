import { describe, expect, it } from "vitest";
import type {
  MatchingConfig,
  PlanTemplateCatalogRecord,
  ProfileSnapshotForRecommendations,
} from "@yuvanext/contracts";
import { buildPlanRecommendationSet, generatePlan } from "./plan-generation.js";

const createdAt = "2026-07-28T00:00:00.000Z";
const target = {
  entityType: "career" as const,
  entityId: "00000000-0000-4000-8000-000000004001",
  title: "Data Scientist",
};

const config: MatchingConfig = {
  algorithmVersion: "plan-v1",
  weightsVersion: "plan-templates-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const baseProfile: ProfileSnapshotForRecommendations = {
  profileSnapshotId: "00000000-0000-4000-8000-000000004100",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "explorer",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

const templates: PlanTemplateCatalogRecord[] = [
  template("00000000-0000-4000-8000-000000004201", "Explorer Missions", "explorer", "exploration", undefined, 1, [
    ["Observe", "Observe one real person working in {{state}}."],
    ["Discuss", "Ask a trusted adult about {{targetTitle}}."],
    ["Try", "Try one small activity related to your recommended option."],
  ]),
  template("00000000-0000-4000-8000-000000004202", "Pathfinder Route Plan", "pathfinder", "pathway", "pathway", 1, [
    ["Week 1", "Compare entry routes for {{targetTitle}}."],
    ["Week 2", "List backup routes for this {{targetType}}."],
  ]),
  template("00000000-0000-4000-8000-000000004203", "Launcher 90 Day Plan", "launcher", "career_90_day", "career", 1, [
    ["Days 1-30", "Build one skill for {{targetTitle}}."],
    ["Days 31-60", "Create one proof project for {{targetTitle}}."],
    ["Days 61-90", "Prepare applications for {{targetTitle}}."],
  ]),
];

describe("plan generation", () => {
  it("generates Explorer exploration missions from approved templates only", () => {
    const item = generatePlan({
      recommendationId: "plan-rec-1",
      profile: baseProfile,
      templates,
      config,
      createdAt,
    });

    expect(item.title).toBe("Explorer Missions");
    expect(item.explanation.planType).toBe("exploration");
    expect(item.explanation.generatedSteps).toHaveLength(3);
    expect(item.explanation.generatedSteps[0]?.actionText).toBe(
      "Observe one real person working in Tamil Nadu.",
    );
  });

  it("generates Pathfinder pathway plans for a selected pathway target", () => {
    const item = generatePlan({
      recommendationId: "plan-rec-1",
      profile: { ...baseProfile, segment: "pathfinder" },
      templates,
      target: {
        entityType: "pathway",
        entityId: "00000000-0000-4000-8000-000000004301",
        title: "BSc Computer Science",
      },
      config,
      createdAt,
    });

    expect(item.title).toBe("Pathfinder Route Plan");
    expect(item.explanation.planType).toBe("pathway");
    expect(item.explanation.targetEntityType).toBe("pathway");
    expect(item.explanation.generatedSteps.map((step) => step.actionText)).toEqual([
      "Compare entry routes for BSc Computer Science.",
      "List backup routes for this pathway.",
    ]);
  });

  it("generates Launcher career 90-day plans for a selected career target", () => {
    const item = generatePlan({
      recommendationId: "plan-rec-1",
      profile: { ...baseProfile, segment: "launcher" },
      templates,
      target,
      config,
      createdAt,
    });

    expect(item.title).toBe("Launcher 90 Day Plan");
    expect(item.explanation.planType).toBe("career_90_day");
    expect(item.explanation.generatedSteps.map((step) => step.timeWindow)).toEqual([
      "Days 1-30",
      "Days 31-60",
      "Days 61-90",
    ]);
    expect(item.explanation.generatedSteps[2]?.actionText).toBe(
      "Prepare applications for Data Scientist.",
    );
  });

  it("selects templates deterministically by priority, title, then ID", () => {
    const duplicateTemplates: PlanTemplateCatalogRecord[] = [
      template("00000000-0000-4000-8000-000000004402", "Same Template", "explorer", "exploration", undefined, 1, [
        ["Step", "Second template."],
      ]),
      template("00000000-0000-4000-8000-000000004401", "Same Template", "explorer", "exploration", undefined, 1, [
        ["Step", "First template."],
      ]),
    ];

    const item = generatePlan({
      recommendationId: "plan-rec-1",
      profile: baseProfile,
      templates: duplicateTemplates,
      config,
      createdAt,
    });

    expect(item.entityId).toBe("00000000-0000-4000-8000-000000004401");
  });

  it("produces the same plan output hash when template input order changes", () => {
    const first = buildPlanRecommendationSet({
      recommendationId: "plan-rec-1",
      profile: { ...baseProfile, segment: "launcher" },
      templates,
      target,
      config,
      createdAt,
    });
    const second = buildPlanRecommendationSet({
      recommendationId: "plan-rec-1",
      profile: { ...baseProfile, segment: "launcher" },
      templates: [...templates].reverse(),
      target,
      config,
      createdAt,
    });

    expect(second.kind).toBe("plan");
    expect(second.items).toEqual(first.items);
    expect(second.outputHash).toBe(first.outputHash);
  });
});

function template(
  planTemplateId: string,
  title: string,
  segment: PlanTemplateCatalogRecord["segment"],
  planType: PlanTemplateCatalogRecord["planType"],
  targetEntityType: PlanTemplateCatalogRecord["targetEntityType"],
  priority: number,
  steps: Array<[string, string]>,
): PlanTemplateCatalogRecord {
  return {
    planTemplateId,
    title,
    segment,
    planType,
    ...(targetEntityType ? { targetEntityType } : {}),
    priority,
    steps: steps.map(([timeWindow, actionTemplate], index) => ({
      stepOrder: index + 1,
      timeWindow,
      actionTemplate,
      isOptional: false,
    })),
    datasetVersion: "plan-templates-2026-a",
    verified: true,
  };
}
