import {
  CareerInterestProfileSchema,
  CareerProfileSchema,
  CareerSchema,
  CareerToolResultSchema,
} from "@yuvanext/contracts";
import {
  careerFixtures,
  careerInterestProfileFixtures,
  careerProfileFixtures,
} from "../../test-fixtures/src/index.js";
import { describe, expect, it } from "vitest";
import {
  CatalogEntityNotFoundError,
  getCareer,
  InMemoryCareerRepository,
} from "../src/index.js";

const careers = CareerSchema.array().parse(careerFixtures);
const interestProfiles = CareerInterestProfileSchema.array().parse(
  careerInterestProfileFixtures,
);
const profiles = CareerProfileSchema.array().parse(
  careerProfileFixtures,
);

const repository = new InMemoryCareerRepository([
  {
    career: careers[0]!,
    interestProfile: interestProfiles[0]!,
    profile: profiles[0]!,
  },
  {
    career: careers[1]!,
    interestProfile: null,
    profile: null,
  },
]);

describe("getCareer", () => {
  it("returns a published career with its reviewed profile", async () => {
    const result = await getCareer(repository, " DATA-SCIENTIST ", {
      now: () => new Date("2026-07-30T10:00:00.000Z"),
    });

    expect(CareerToolResultSchema.parse(result)).toEqual(result);
    expect(result.data.career.title).toBe("Data Scientist");
    expect(result.data.profile?.reviewStatus).toBe("reviewed");
    expect(result.retrievedAt).toBe("2026-07-30T10:00:00.000Z");
  });

  it("treats draft and unknown careers as not found", async () => {
    await expect(
      getCareer(repository, "solar-panel-technician"),
    ).rejects.toBeInstanceOf(CatalogEntityNotFoundError);
    await expect(
      getCareer(repository, "unknown-career"),
    ).rejects.toMatchObject({
      code: "CATALOG_ENTITY_NOT_FOUND",
    });
  });

  it("excludes an unreviewed rich profile", async () => {
    const draftProfile = CareerProfileSchema.parse({
      ...careerProfileFixtures[0],
      reviewStatus: "draft",
      lastReviewedAt: null,
    });
    const draftProfileRepository = new InMemoryCareerRepository([
      {
        career: careers[0]!,
        interestProfile: interestProfiles[0]!,
        profile: draftProfile,
      },
    ]);

    const result = await getCareer(
      draftProfileRepository,
      "data-scientist",
    );

    expect(result.data.profile).toBeNull();
    expect(result.caveats).toEqual([
      "Rich career profile is awaiting counselor review.",
    ]);
  });
});
