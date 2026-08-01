import { AidCriterionSchema, AidSchemeListResponseSchema, AidSchemeSchema } from "@yuvanext/contracts";
import { aidCriterionFixtures, aidSchemeFixtures } from "../../test-fixtures/src/index.js";
import { describe, expect, it } from "vitest";
import { getAidSchemes, InMemoryAidSchemeRepository } from "../src/index.js";

describe("getAidSchemes", () => {
  it("returns only verified, matching schemes with a confirmation caveat", async () => {
    const repository = new InMemoryAidSchemeRepository(
      AidSchemeSchema.array().parse(aidSchemeFixtures),
      AidCriterionSchema.array().parse(aidCriterionFixtures),
    );
    const response = await getAidSchemes(
      repository,
      { state: "Tamil Nadu", level: "ug", limit: 20 },
      () => new Date("2026-08-01T10:00:00.000Z"),
    );

    expect(AidSchemeListResponseSchema.parse(response)).toEqual(response);
    expect(response.data.map(({ aidCode }) => aidCode)).toEqual(["TN-UG-DEMO"]);
    expect(response.sourceDataVersions).toEqual({
      aidSchemes: "d2222222-2222-4222-8222-222222222222",
    });
    expect(response.caveats[0]).toContain("informational");
  });

  it("filters out schemes when supplied required criteria do not match", async () => {
    const repository = new InMemoryAidSchemeRepository(
      AidSchemeSchema.array().parse(aidSchemeFixtures),
      AidCriterionSchema.array().parse(aidCriterionFixtures),
    );
    const matching = await getAidSchemes(repository, {
      state: "Tamil Nadu", level: "ug", annualIncome: 250000,
      category: "obc", limit: 20,
    });
    const overIncome = await getAidSchemes(repository, {
      state: "Tamil Nadu", level: "ug", annualIncome: 250001,
      category: "obc", limit: 20,
    });
    const wrongCategory = await getAidSchemes(repository, {
      state: "Tamil Nadu", level: "ug", annualIncome: 200000,
      category: "general", limit: 20,
    });

    expect(matching.data).toHaveLength(1);
    expect(overIncome.data).toEqual([]);
    expect(wrongCategory.data).toEqual([]);
  });
});
