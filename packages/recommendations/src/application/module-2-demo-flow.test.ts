import { describe, expect, it } from "vitest";
import {
  MODULE_2_DEMO_CREATED_AT,
  module2DemoAidSchemes,
  module2DemoCareers,
  module2DemoColleges,
  module2DemoConfig,
  module2DemoNeighboringStates,
  module2DemoPathways,
  module2DemoPlanTemplates,
  module2DemoProfile,
  module2DemoStoredFacts,
  module2DemoStreams,
  module2DemoTargetDisciplineIds,
  module2ExplorerProfile,
  module2LauncherProfile,
} from "../../../test-fixtures/src/module-2-demo.js";
import { createRecommendationService } from "./recommendation-service.js";

describe("Module 2 demo fixture flow", () => {
  it("contains the MVP fixture coverage required by the Module 2 POC", () => {
    expect(module2DemoCareers).toHaveLength(18);
    expect(new Set(module2DemoColleges.map((college) => college.state)).size).toBeGreaterThanOrEqual(5);
    expect(module2DemoColleges.some((college) => college.collegeType === "open_university")).toBe(true);
    expect(
      module2DemoColleges.some((college) =>
        ["vocational", "polytechnic", "iti"].includes(college.collegeType),
      ),
    ).toBe(true);
    expect(module2DemoAidSchemes).toHaveLength(5);
    expect(
      [module2ExplorerProfile.segment, module2DemoProfile.segment, module2LauncherProfile.segment].sort(),
    ).toEqual(["explorer", "launcher", "pathfinder"]);
  });

  it("runs one complete deterministic MVP journey", async () => {
    const service = createRecommendationService();
    const careerSet = await service.recommendCareers({
      recommendationId: "demo-careers",
      profile: module2DemoProfile,
      careers: module2DemoCareers,
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const streamSet = await service.recommendStreams({
      recommendationId: "demo-streams",
      profile: module2DemoProfile,
      streams: module2DemoStreams,
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const pathwaySet = await service.recommendPathways({
      recommendationId: "demo-pathways",
      profile: module2DemoProfile,
      pathways: module2DemoPathways,
      rankedCareerIds: careerSet.items.map((item) => item.entityId),
      rankedStreamIds: streamSet.items.map((item) => item.entityId),
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const collegeSet = await service.recommendColleges({
      recommendationId: "demo-colleges",
      profile: module2DemoProfile,
      colleges: module2DemoColleges,
      targetDisciplineIds: module2DemoTargetDisciplineIds,
      selectedState: "Tamil Nadu",
      neighboringStates: module2DemoNeighboringStates,
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const aidSet = await service.recommendAid({
      recommendationId: "demo-aid",
      profile: module2DemoProfile,
      aidSchemes: module2DemoAidSchemes,
      storedFacts: module2DemoStoredFacts,
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const topPathway = pathwaySet.items[0];
    if (!topPathway) {
      throw new Error("Demo fixture must produce at least one pathway");
    }
    const planSet = await service.generatePlan({
      recommendationId: "demo-plan",
      profile: module2DemoProfile,
      templates: module2DemoPlanTemplates,
      target: {
        entityType: "pathway",
        entityId: topPathway.entityId,
        title: topPathway.title,
      },
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });

    expect(careerSet.items[0]?.title).toBe("Data Scientist");
    expect(streamSet.items[0]?.title).toBe("Science with Computer Science");
    expect(pathwaySet.items[0]?.title).toBe("BSc Computer Science");
    expect(collegeSet.items[0]?.title).toBe("Chennai Science College");
    expect(aidSet.items[0]?.title).toBe("State Merit Scholarship");
    expect(planSet.items[0]?.title).toBe("Pathfinder Route Plan");
  });

  it("generates approved plan templates for explorer and launcher profiles", async () => {
    const service = createRecommendationService();
    const explorerPlan = await service.generatePlan({
      recommendationId: "demo-explorer-plan",
      profile: module2ExplorerProfile,
      templates: module2DemoPlanTemplates,
      target: {
        entityType: "stream",
        entityId: module2DemoStreams[1]?.streamId ?? "",
        title: module2DemoStreams[1]?.title ?? "Arts and Design",
      },
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });
    const launcherPlan = await service.generatePlan({
      recommendationId: "demo-launcher-plan",
      profile: module2LauncherProfile,
      templates: module2DemoPlanTemplates,
      target: {
        entityType: "career",
        entityId: module2DemoCareers[14]?.careerId ?? "",
        title: module2DemoCareers[14]?.title ?? "Cybersecurity Analyst",
      },
      config: module2DemoConfig,
      createdAt: MODULE_2_DEMO_CREATED_AT,
    });

    expect(explorerPlan.items[0]?.title).toBe("Explorer Safe Missions");
    expect(launcherPlan.items[0]?.title).toBe("Launcher 90 Day Plan");
  });
});
