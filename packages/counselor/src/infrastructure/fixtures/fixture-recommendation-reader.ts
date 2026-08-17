import { RecommendationSetSchema, type RecommendationSet } from "@yuvanext/contracts";
import type { ReadRecommendationInput, RecommendationReader } from "../../application/index.js";

export class FixtureRecommendationReader implements RecommendationReader {
  private readonly recommendations: RecommendationSet[];

  constructor(
    recommendations: RecommendationSet[],
    private readonly userId?: string,
  ) {
    this.recommendations = recommendations.map((recommendation) =>
      RecommendationSetSchema.parse(recommendation),
    );
  }

  getRecommendationSet(input: ReadRecommendationInput): Promise<RecommendationSet | null> {
    const matches = this.recommendations.filter(
      (recommendation) =>
        (!this.userId || input.userId === this.userId) &&
        recommendation.profileSnapshotId === input.profileSnapshotId &&
        (!input.recommendationId || recommendation.recommendationId === input.recommendationId),
    );

    return Promise.resolve(matches.at(-1) ?? null);
  }
}
