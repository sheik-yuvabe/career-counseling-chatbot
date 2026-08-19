import { RecommendationSetSchema, type RecommendationSet } from "@yuvanext/contracts";
import type {
  ReadRecommendationSetInput,
  RecommendationSetReader,
} from "../application/recommendation-set-reader.js";

export class FixtureRecommendationSetReader implements RecommendationSetReader {
  private readonly recommendations: RecommendationSet[];

  constructor(
    recommendations: RecommendationSet[],
    private readonly userId: string,
  ) {
    this.recommendations = recommendations.map((recommendation) =>
      RecommendationSetSchema.parse(recommendation),
    );
  }

  getRecommendationSet(input: ReadRecommendationSetInput): Promise<RecommendationSet | null> {
    const recommendation =
      input.userId === this.userId
        ? this.recommendations.find(
            (candidate) =>
              (!input.recommendationId || candidate.recommendationId === input.recommendationId) &&
              (!input.profileSnapshotId || candidate.profileSnapshotId === input.profileSnapshotId),
          )
        : undefined;
    return Promise.resolve(recommendation ?? null);
  }
}
