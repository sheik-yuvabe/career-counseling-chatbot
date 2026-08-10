import type {
  MatchingConfig,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
  RiasecLetter,
  StreamCatalogRecord,
  StreamFitExplanation,
} from "@yuvanext/contracts";
import { stableHash } from "./career-matching.js";

export type StreamRecommendationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  streams: StreamCatalogRecord[];
  config: MatchingConfig;
  createdAt: string;
};

export type ScoredStream = RecommendationItem & {
  entityType: "stream";
  explanation: StreamFitExplanation;
};

export function scoreStreams(input: StreamRecommendationInput): ScoredStream[] {
  const topStudentLetters = topRiasecLetters(input.profile.riasec, input.config.riasecTieOrder, 3);

  return input.streams
    .filter((stream) => stream.verified)
    .map((stream) => {
      const matchedLetters = topStudentLetters.filter((letter) =>
        stream.riasecLetters.includes(letter),
      );
      const riasecOverlap = round(matchedLetters.length / topStudentLetters.length, input.config.roundingScale);
      const segmentFit = stream.recommendedSegments.includes(input.profile.segment) ? 1 : 0;
      const marksFit = calculateMarksFit(input.profile.marksBand, stream.marksBands);
      const priorityFit = 1 / (stream.priority + 1);
      const fitScore = round(
        riasecOverlap * 0.55 + segmentFit * 0.25 + marksFit * 0.15 + priorityFit * 0.05,
        input.config.roundingScale,
      );

      const item: ScoredStream = {
        itemId: `stream:${stream.streamId}`,
        entityType: "stream",
        entityId: stream.streamId,
        title: stream.title,
        rank: 1,
        fitScore,
        explanation: {
          schemaVersion: 1 as const,
          riasecOverlap,
          segmentFit,
          marksFit,
          catalogPriority: stream.priority,
          topStudentLetters,
          matchedLetters,
        },
        entityDatasetVersion: stream.datasetVersion,
      };

      return item;
    })
    .sort(compareScoredStreams)
    .map((stream, index) => ({ ...stream, rank: index + 1 }));
}

export function buildStreamRecommendationSet(input: StreamRecommendationInput): RecommendationSet {
  const items = scoreStreams(input);
  const sourceDataVersions = collectSourceDataVersions(input.streams);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    streamIds: input.streams
      .map((stream) => ({
        streamId: stream.streamId,
        datasetVersion: stream.datasetVersion,
      }))
      .sort((left, right) => left.streamId.localeCompare(right.streamId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "stream",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "stream",
    items,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
    sourceDataVersions,
    inputHash,
    outputHash,
    createdAt: input.createdAt,
  };
}

function topRiasecLetters(
  vector: ProfileSnapshotForRecommendations["riasec"],
  tieOrder: MatchingConfig["riasecTieOrder"],
  count: number,
): RiasecLetter[] {
  return [...tieOrder]
    .sort((left, right) => {
      const scoreDifference = vector[right] - vector[left];
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return tieOrder.indexOf(left) - tieOrder.indexOf(right);
    })
    .slice(0, count);
}

function calculateMarksFit(profileMarksBand: string | undefined, streamMarksBands: string[] | undefined): number {
  if (!streamMarksBands || streamMarksBands.length === 0) {
    return 0.5;
  }

  if (!profileMarksBand) {
    return 0.5;
  }

  return streamMarksBands.includes(profileMarksBand) ? 1 : 0;
}

function compareScoredStreams(left: ScoredStream, right: ScoredStream): number {
  const scoreDifference = (right.fitScore ?? 0) - (left.fitScore ?? 0);
  if (scoreDifference !== 0) {
    return scoreDifference;
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

function collectSourceDataVersions(streams: StreamCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(streams.map((stream) => stream.datasetVersion))].sort();
  return { streams: versions.join(",") };
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}
