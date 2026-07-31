import type { RecommendationSet } from "@yuvanext/contracts";

export type StoredRecommendationSet = RecommendationSet;

export type RecommendationStore = {
  save(set: RecommendationSet): RecommendationSet;
  findById(recommendationId: string): RecommendationSet | undefined;
  clear(): void;
};

export function createInMemoryRecommendationStore(): RecommendationStore {
  const sets = new Map<string, RecommendationSet>();

  return {
    save(set) {
      if (sets.has(set.recommendationId)) {
        throw new Error(`Recommendation ${set.recommendationId} already exists`);
      }

      sets.set(set.recommendationId, set);
      return set;
    },
    findById(recommendationId) {
      return sets.get(recommendationId);
    },
    clear() {
      sets.clear();
    },
  };
}
