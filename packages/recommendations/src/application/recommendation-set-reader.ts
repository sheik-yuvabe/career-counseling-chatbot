import type { RecommendationSet } from "@yuvanext/contracts";

export type ReadRecommendationSetInput = {
  userId: string;
  recommendationId?: string;
  profileSnapshotId?: string;
};

export interface RecommendationSetReader {
  getRecommendationSet(input: ReadRecommendationSetInput): Promise<RecommendationSet | null>;
}
