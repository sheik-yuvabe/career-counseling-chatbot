import {
  CareerInterestProfileSchema,
  CareerProfileSchema,
  CareerSchema,
} from "@yuvanext/contracts";
import {
  careerFixtures,
  careerInterestProfileFixtures,
  careerProfileFixtures,
} from "../../test-fixtures/src/index.js";
import { describe, expect, it } from "vitest";

describe("career catalog contracts", () => {
  it("accepts the synthetic career catalog fixtures", () => {
    expect(CareerSchema.array().parse(careerFixtures)).toHaveLength(2);
    expect(
      CareerInterestProfileSchema.array().parse(
        careerInterestProfileFixtures,
      ),
    ).toHaveLength(1);
    expect(
      CareerProfileSchema.array().parse(careerProfileFixtures),
    ).toHaveLength(1);
  });

  it("requires a publication date for published careers", () => {
    const result = CareerSchema.safeParse({
      ...careerFixtures[0],
      publishedAt: null,
    });

    expect(result.success).toBe(false);
  });

  it("requires review metadata and salary honesty", () => {
    const missingReviewDate = CareerProfileSchema.safeParse({
      ...careerProfileFixtures[0],
      lastReviewedAt: null,
    });
    const missingSalaryNote = CareerProfileSchema.safeParse({
      ...careerProfileFixtures[0],
      salaryNote: null,
    });

    expect(missingReviewDate.success).toBe(false);
    expect(missingSalaryNote.success).toBe(false);
  });
});
