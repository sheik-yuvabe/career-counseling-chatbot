import type {
  AidFitExplanation,
  AidLikelihoodLabel,
  AidSchemeCatalogRecord,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
} from "@yuvanext/contracts";
import { stableHash } from "./career-matching.js";

export type StoredFacts = Record<string, string | number | boolean | null | undefined>;

export type AidRecommendationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  aidSchemes: AidSchemeCatalogRecord[];
  storedFacts: StoredFacts;
  config: MatchingConfig;
  createdAt: string;
};

export type ScoredAidScheme = RecommendationItem & {
  entityType: "aid";
  explanation: AidFitExplanation;
};

const LABEL_ORDER: Record<AidLikelihoodLabel, number> = {
  likely: 0,
  check_conditions: 1,
  explore: 2,
};

export function scoreAidSchemes(input: AidRecommendationInput): ScoredAidScheme[] {
  return input.aidSchemes
    .filter((scheme) => scheme.verified)
    .map((scheme) => {
      const knownMatchedFactKeys: string[] = [];
      const unknownFactKeys: string[] = [];
      const mismatchedFactKeys: string[] = [];

      for (const criterion of scheme.criteria) {
        const storedValue = input.storedFacts[criterion.factKey];

        if (storedValue === undefined || storedValue === null || storedValue === "") {
          unknownFactKeys.push(criterion.factKey);
          continue;
        }

        if (!criterion.acceptedValues || criterion.acceptedValues.length === 0) {
          knownMatchedFactKeys.push(criterion.factKey);
          continue;
        }

        if (criterion.acceptedValues.includes(String(storedValue))) {
          knownMatchedFactKeys.push(criterion.factKey);
        } else {
          mismatchedFactKeys.push(criterion.factKey);
        }
      }

      const likelihoodLabel = labelAidScheme({
        knownMatchedCount: knownMatchedFactKeys.length,
        unknownCount: unknownFactKeys.length,
        mismatchCount: mismatchedFactKeys.length,
        totalCriteria: scheme.criteria.length,
      });
      const evidenceScore = round(
        knownMatchedFactKeys.length / scheme.criteria.length,
        input.config.roundingScale,
      );
      const fitScore = round(
        labelScore(likelihoodLabel) * 0.7 +
          evidenceScore * 0.25 +
          (1 / (scheme.priority + 1)) * 0.05,
        input.config.roundingScale,
      );

      const item: ScoredAidScheme = {
        itemId: `aid:${scheme.aidSchemeId}`,
        entityType: "aid",
        entityId: scheme.aidSchemeId,
        title: scheme.title,
        rank: 1,
        fitScore,
        explanation: {
          schemaVersion: 1 as const,
          likelihoodLabel,
          knownMatchedFactKeys,
          unknownFactKeys,
          mismatchedFactKeys,
          evidenceScore,
          catalogPriority: scheme.priority,
          ...(scheme.sourceUrl ? { sourceUrl: scheme.sourceUrl } : {}),
        },
        entityDatasetVersion: scheme.datasetVersion,
      };

      return item;
    })
    .sort(compareScoredAidSchemes)
    .map((scheme, index) => ({ ...scheme, rank: index + 1 }));
}

export function buildAidRecommendationSet(input: AidRecommendationInput): RecommendationSet {
  const items = scoreAidSchemes(input);
  const sourceDataVersions = collectSourceDataVersions(input.aidSchemes);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    storedFacts: stableFacts(input.storedFacts),
    aidSchemeIds: input.aidSchemes
      .map((scheme) => ({
        aidSchemeId: scheme.aidSchemeId,
        datasetVersion: scheme.datasetVersion,
      }))
      .sort((left, right) => left.aidSchemeId.localeCompare(right.aidSchemeId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "aid",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "aid",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
    sourceDataVersions,
    inputHash,
    outputHash,
    createdAt: input.createdAt,
  };
}

function labelAidScheme(input: {
  knownMatchedCount: number;
  unknownCount: number;
  mismatchCount: number;
  totalCriteria: number;
}): AidLikelihoodLabel {
  if (input.mismatchCount > 0) {
    return "explore";
  }

  if (input.knownMatchedCount === input.totalCriteria && input.unknownCount === 0) {
    return "likely";
  }

  if (input.knownMatchedCount > 0 && input.unknownCount > 0) {
    return "check_conditions";
  }

  return "explore";
}

function compareScoredAidSchemes(left: ScoredAidScheme, right: ScoredAidScheme): number {
  const labelDifference =
    LABEL_ORDER[left.explanation.likelihoodLabel] - LABEL_ORDER[right.explanation.likelihoodLabel];
  if (labelDifference !== 0) {
    return labelDifference;
  }

  const evidenceDifference = right.explanation.evidenceScore - left.explanation.evidenceScore;
  if (evidenceDifference !== 0) {
    return evidenceDifference;
  }

  const priorityDifference = left.explanation.catalogPriority - right.explanation.catalogPriority;
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const titleDifference = normalizeTitle(left.title).localeCompare(normalizeTitle(right.title), "en");
  if (titleDifference !== 0) {
    return titleDifference;
  }

  return left.entityId.localeCompare(right.entityId, "en");
}

function labelScore(label: AidLikelihoodLabel): number {
  if (label === "likely") {
    return 1;
  }

  if (label === "check_conditions") {
    return 0.65;
  }

  return 0.3;
}

function collectSourceDataVersions(aidSchemes: AidSchemeCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(aidSchemes.map((scheme) => scheme.datasetVersion))].sort();
  return { aidSchemes: versions.join(",") };
}

function stableFacts(facts: StoredFacts): StoredFacts {
  return Object.fromEntries(Object.entries(facts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}
