import { validProfileSnapshot, validRecommendationSet } from "@yuvanext/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  FixtureRecommendationSetReader,
  GetRecommendationSetService,
  RecommendationSetNotFoundError,
} from "../src/index.js";

describe("GetRecommendationSetService", () => {
  const reader = new FixtureRecommendationSetReader(
    [validRecommendationSet],
    validProfileSnapshot.userId,
  );
  const service = new GetRecommendationSetService(reader);

  it("returns an owned recommendation set through the shared response contract", async () => {
    await expect(
      service.execute({
        userId: validProfileSnapshot.userId,
        recommendationId: validRecommendationSet.recommendationId,
      }),
    ).resolves.toEqual({ recommendation: validRecommendationSet });
  });

  it("does not expose a recommendation set to another user", async () => {
    await expect(
      service.execute({
        userId: "00000000-0000-4000-8000-000000000499",
        recommendationId: validRecommendationSet.recommendationId,
      }),
    ).rejects.toBeInstanceOf(RecommendationSetNotFoundError);
  });
});
