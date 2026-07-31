import type {
  MatchingConfig,
  PathwayCatalogRecord,
  PathwayFitExplanation,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
} from "@yuvanext/contracts";
import { stableHash } from "./career-matching.js";

export type PathwayRecommendationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  pathways: PathwayCatalogRecord[];
  rankedCareerIds: string[];
  rankedStreamIds: string[];
  config: MatchingConfig;
  createdAt: string;
};

export type ScoredPathway = RecommendationItem & {
  entityType: "pathway";
  explanation: PathwayFitExplanation;
};

export function scorePathways(input: PathwayRecommendationInput): ScoredPathway[] {
  return input.pathways
    .filter((pathway) => pathway.verified)
    .map((pathway) => {
      const matchedCareerIds = input.rankedCareerIds.filter((careerId) =>
        pathway.careerIds.includes(careerId),
      );
      const matchedStreamIds = input.rankedStreamIds.filter((streamId) =>
        pathway.streamIds.includes(streamId),
      );
      const careerAlignment = rankedAlignment(matchedCareerIds, input.rankedCareerIds, input.config.roundingScale);
      const streamAlignment = rankedAlignment(matchedStreamIds, input.rankedStreamIds, input.config.roundingScale);
      const segmentFit = pathway.recommendedSegments.includes(input.profile.segment) ? 1 : 0;
      const marksFit = calculateMarksFit(input.profile.marksBand, pathway.marksBands);
      const reachability = round(pathway.reachability, input.config.roundingScale);
      const backupRouteFit = pathway.hasBackupRoute ? 1 : 0;
      const priorityFit = 1 / (pathway.priority + 1);
      const fitScore = round(
        careerAlignment * 0.3 +
          streamAlignment * 0.2 +
          segmentFit * 0.15 +
          marksFit * 0.1 +
          reachability * 0.2 +
          backupRouteFit * 0.03 +
          priorityFit * 0.02,
        input.config.roundingScale,
      );

      const item: ScoredPathway = {
        itemId: `pathway:${pathway.pathwayId}`,
        entityType: "pathway",
        entityId: pathway.pathwayId,
        title: pathway.title,
        rank: 1,
        fitScore,
        explanation: {
          schemaVersion: 1 as const,
          careerAlignment,
          streamAlignment,
          segmentFit,
          marksFit,
          reachability,
          backupRouteFit,
          catalogPriority: pathway.priority,
          matchedCareerIds,
          matchedStreamIds,
        },
        entityDatasetVersion: pathway.datasetVersion,
      };

      return item;
    })
    .sort(compareScoredPathways)
    .map((pathway, index) => ({ ...pathway, rank: index + 1 }));
}

export function buildPathwayRecommendationSet(input: PathwayRecommendationInput): RecommendationSet {
  const items = scorePathways(input);
  const sourceDataVersions = collectSourceDataVersions(input.pathways);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    rankedCareerIds: input.rankedCareerIds,
    rankedStreamIds: input.rankedStreamIds,
    pathwayIds: input.pathways
      .map((pathway) => ({
        pathwayId: pathway.pathwayId,
        datasetVersion: pathway.datasetVersion,
      }))
      .sort((left, right) => left.pathwayId.localeCompare(right.pathwayId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "pathway",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "pathway",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
    sourceDataVersions,
    inputHash,
    outputHash,
    createdAt: input.createdAt,
  };
}

function rankedAlignment(matchedIds: string[], rankedIds: string[], roundingScale: number): number {
  if (rankedIds.length === 0 || matchedIds.length === 0) {
    return 0;
  }

  const totalWeight = rankedIds.reduce((sum, _id, index) => sum + 1 / (index + 1), 0);
  const matchedWeight = matchedIds.reduce((sum, id) => {
    const index = rankedIds.indexOf(id);
    return index === -1 ? sum : sum + 1 / (index + 1);
  }, 0);

  return round(matchedWeight / totalWeight, roundingScale);
}

function calculateMarksFit(profileMarksBand: string | undefined, pathwayMarksBands: string[] | undefined): number {
  if (!pathwayMarksBands || pathwayMarksBands.length === 0) {
    return 0.5;
  }

  if (!profileMarksBand) {
    return 0.5;
  }

  return pathwayMarksBands.includes(profileMarksBand) ? 1 : 0;
}

function compareScoredPathways(left: ScoredPathway, right: ScoredPathway): number {
  const scoreDifference = (right.fitScore ?? 0) - (left.fitScore ?? 0);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const reachabilityDifference = right.explanation.reachability - left.explanation.reachability;
  if (reachabilityDifference !== 0) {
    return reachabilityDifference;
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

function collectSourceDataVersions(pathways: PathwayCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(pathways.map((pathway) => pathway.datasetVersion))].sort();
  return { pathways: versions.join(",") };
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}
