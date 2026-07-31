import { createHash } from "node:crypto";
import type {
  CareerCatalogRecord,
  CareerFitExplanation,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
  RiasecLetter,
  RiasecVector,
} from "@yuvanext/contracts";

const RIASEC_LETTERS: readonly RiasecLetter[] = ["R", "I", "A", "S", "E", "C"];

export type FeasibilityRule = {
  segment: ProfileSnapshotForRecommendations["segment"];
  marksBand: string;
  routeId: string;
  reachability: 0.3 | 0.65 | 1;
  priority: number;
};

export type CounselorPriority = {
  careerId: string;
  boost: number;
};

export type CareerRecommendationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  careers: CareerCatalogRecord[];
  config: MatchingConfig;
  feasibilityRules?: FeasibilityRule[];
  counselorPriorities?: CounselorPriority[];
  createdAt: string;
};

export type ScoredCareer = RecommendationItem & {
  explanation: CareerFitExplanation;
};

export type CareerRings = {
  inner: ScoredCareer[];
  middle: ScoredCareer[];
  outer: ScoredCareer[];
};

export function normalizeRiasecVector(vector: RiasecVector): RiasecVector {
  const values = RIASEC_LETTERS.map((letter) => vector[letter]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  }

  return {
    R: (vector.R - min) / (max - min),
    I: (vector.I - min) / (max - min),
    A: (vector.A - min) / (max - min),
    S: (vector.S - min) / (max - min),
    E: (vector.E - min) / (max - min),
    C: (vector.C - min) / (max - min),
  };
}

export function pearsonCorrelation(left: RiasecVector, right: RiasecVector): number {
  const leftValues = RIASEC_LETTERS.map((letter) => left[letter]);
  const rightValues = RIASEC_LETTERS.map((letter) => right[letter]);
  const leftMean = average(leftValues);
  const rightMean = average(rightValues);

  let numerator = 0;
  let leftSquared = 0;
  let rightSquared = 0;

  for (let index = 0; index < RIASEC_LETTERS.length; index += 1) {
    const leftValue = leftValues[index] ?? 0;
    const rightValue = rightValues[index] ?? 0;
    const leftDelta = leftValue - leftMean;
    const rightDelta = rightValue - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquared += leftDelta ** 2;
    rightSquared += rightDelta ** 2;
  }

  const denominator = Math.sqrt(leftSquared) * Math.sqrt(rightSquared);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function scoreCareers(input: CareerRecommendationInput): ScoredCareer[] {
  const normalizedProfile = normalizeRiasecVector(input.profile.riasec);

  return input.careers
    .filter((career) => career.verified)
    .map((career) => {
      const normalizedCareer = normalizeRiasecVector(career.riasec);
      const interestFit = round((pearsonCorrelation(normalizedProfile, normalizedCareer) + 1) / 2, input.config.roundingScale);
      const valuesFit = calculateValuesFit(input.profile.workValues, career.workValues, input.config.roundingScale);
      const feasibility = lookupFeasibility(input.profile, career, input.feasibilityRules ?? []);
      const contextBoost = lookupContextBoost(career.careerId, input.counselorPriorities ?? [], input.config.roundingScale);
      const weights = resolveWeights(input.config, valuesFit === undefined);
      const fitScore = round(
        interestFit * weights.interest +
          (valuesFit ?? 0) * weights.values +
          feasibility * weights.feasibility +
          contextBoost * weights.context,
        input.config.roundingScale,
      );

      const item: ScoredCareer = {
        itemId: `career:${career.careerId}`,
        entityType: "career" as const,
        entityId: career.careerId,
        title: career.title,
        rank: 1,
        fitScore,
        explanation: {
          schemaVersion: 1 as const,
          interestFit,
          ...(valuesFit === undefined ? {} : { valuesFit }),
          feasibility,
          contextBoost,
          weights,
          topMatchingScales: topRiasecLetters(career.riasec, input.config.riasecTieOrder),
          tradeoffKey: null,
        },
        entityDatasetVersion: career.datasetVersion,
      };

      return item;
    })
    .sort(compareScoredCareers)
    .map((career, index) => ({ ...career, rank: index + 1 }));
}

export function buildCareerRecommendationSet(input: CareerRecommendationInput): RecommendationSet {
  const items = scoreCareers(input);
  const rings = partitionCareerRings(items, input.profile, input.careers, input.config);
  const ringedItems = [...rings.inner, ...rings.middle, ...rings.outer].sort(
    (left, right) => left.rank - right.rank,
  );
  const sourceDataVersions = collectSourceDataVersions(input.careers);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    careerIds: input.careers
      .map((career) => ({
        careerId: career.careerId,
        datasetVersion: career.datasetVersion,
      }))
      .sort((left, right) => left.careerId.localeCompare(right.careerId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "career",
    items: ringedItems,
    rings,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "career",
    items: ringedItems,
    rings,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
    sourceDataVersions,
    inputHash,
    outputHash,
    createdAt: input.createdAt,
  };
}

export function partitionCareerRings(
  scoredCareers: ScoredCareer[],
  profile: ProfileSnapshotForRecommendations,
  catalogCareers: CareerCatalogRecord[],
  config: MatchingConfig,
): CareerRings {
  const candidates = scoredCareers.slice(0, 18);
  const studentTopLetter = topRiasecLetters(profile.riasec, config.riasecTieOrder)[0] ?? "R";
  const adjacentLetters = adjacentRiasecLetters(studentTopLetter);
  const catalogById = new Map(catalogCareers.map((career) => [career.careerId, career]));

  const inner = takeMatching(candidates, [], 4, (career) =>
    career.explanation.topMatchingScales.includes(studentTopLetter),
  );
  const middle = takeMatching(candidates, inner, 6, (career) =>
    career.explanation.topMatchingScales.some((letter) => adjacentLetters.includes(letter)),
  );
  const outer = takeMatching(candidates, [...inner, ...middle], 6, () => true);

  rebalanceVocationalOuter(inner, middle, outer, catalogById);

  return {
    inner: withRing(inner, "inner"),
    middle: withRing(middle, "middle"),
    outer: withRing(outer, "outer"),
  };
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function calculateValuesFit(
  profileValues: RiasecVector | undefined,
  careerValues: RiasecVector | undefined,
  roundingScale: number,
): number | undefined {
  if (!profileValues || !careerValues) {
    return undefined;
  }

  return round((pearsonCorrelation(normalizeRiasecVector(profileValues), normalizeRiasecVector(careerValues)) + 1) / 2, roundingScale);
}

function resolveWeights(config: MatchingConfig, valuesMissing: boolean): CareerFitExplanation["weights"] {
  if (!valuesMissing) {
    return {
      interest: config.interestWeight,
      values: config.valuesWeight,
      feasibility: config.feasibilityWeight,
      context: config.contextWeight,
    };
  }

  return {
    interest: config.interestWeight + config.valuesWeight,
    values: 0,
    feasibility: config.feasibilityWeight,
    context: config.contextWeight,
  };
}

function lookupFeasibility(
  profile: ProfileSnapshotForRecommendations,
  career: CareerCatalogRecord,
  rules: FeasibilityRule[],
): 0.3 | 0.65 | 1 {
  const marksBand = profile.marksBand ?? "unknown";
  const matches = rules
    .filter(
      (rule) =>
        rule.segment === profile.segment &&
        rule.marksBand === marksBand &&
        career.routeIds.includes(rule.routeId),
    )
    .sort((left, right) => left.priority - right.priority);

  return matches[0]?.reachability ?? 0.65;
}

function lookupContextBoost(careerId: string, priorities: CounselorPriority[], roundingScale: number): number {
  const priority = priorities.find((candidate) => candidate.careerId === careerId);
  return round(Math.min(Math.max(priority?.boost ?? 0, 0), 1), roundingScale);
}

function topRiasecLetters(vector: RiasecVector, tieOrder: MatchingConfig["riasecTieOrder"]): RiasecLetter[] {
  const highest = Math.max(...RIASEC_LETTERS.map((letter) => vector[letter]));
  return tieOrder.filter((letter) => vector[letter] === highest);
}

function adjacentRiasecLetters(letter: RiasecLetter): RiasecLetter[] {
  const index = RIASEC_LETTERS.indexOf(letter);
  const previous = RIASEC_LETTERS[(index + RIASEC_LETTERS.length - 1) % RIASEC_LETTERS.length] ?? "R";
  const next = RIASEC_LETTERS[(index + 1) % RIASEC_LETTERS.length] ?? "R";
  return [previous, next];
}

function takeMatching(
  candidates: ScoredCareer[],
  alreadyTaken: ScoredCareer[],
  targetCount: number,
  predicate: (career: ScoredCareer) => boolean,
): ScoredCareer[] {
  const takenIds = new Set(alreadyTaken.map((career) => career.entityId));
  const matches = candidates.filter((career) => !takenIds.has(career.entityId) && predicate(career));

  if (matches.length >= targetCount) {
    return matches.slice(0, targetCount);
  }

  const fallback = candidates.filter(
    (career) =>
      !takenIds.has(career.entityId) &&
      !matches.some((match) => match.entityId === career.entityId),
  );

  return [...matches, ...fallback].slice(0, targetCount);
}

function rebalanceVocationalOuter(
  inner: ScoredCareer[],
  middle: ScoredCareer[],
  outer: ScoredCareer[],
  catalogById: Map<string, CareerCatalogRecord>,
): void {
  if (outer.some((career) => catalogById.get(career.entityId)?.isVocationalRoute)) {
    return;
  }

  const vocationalFromEarlierRing = [...middle, ...inner]
    .filter((career) => catalogById.get(career.entityId)?.isVocationalRoute)
    .sort((left, right) => right.rank - left.rank)[0];

  if (!vocationalFromEarlierRing || outer.length === 0) {
    return;
  }

  const sourceRing = middle.some((career) => career.entityId === vocationalFromEarlierRing.entityId)
    ? middle
    : inner;
  const sourceIndex = sourceRing.findIndex(
    (career) => career.entityId === vocationalFromEarlierRing.entityId,
  );
  const replacement = outer.shift();

  if (sourceIndex >= 0 && replacement) {
    sourceRing.splice(sourceIndex, 1, replacement);
    outer.push(vocationalFromEarlierRing);
    sourceRing.sort((left, right) => left.rank - right.rank);
    outer.sort((left, right) => left.rank - right.rank);
  }
}

function withRing(careers: ScoredCareer[], ring: NonNullable<ScoredCareer["ring"]>): ScoredCareer[] {
  return careers.map((career) => ({ ...career, ring }));
}

function compareScoredCareers(left: ScoredCareer, right: ScoredCareer): number {
  const scoreDifference = (right.fitScore ?? 0) - (left.fitScore ?? 0);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const titleDifference = normalizeTitle(left.title).localeCompare(normalizeTitle(right.title), "en");
  if (titleDifference !== 0) {
    return titleDifference;
  }

  return left.entityId.localeCompare(right.entityId, "en");
}

function collectSourceDataVersions(careers: CareerCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(careers.map((career) => career.datasetVersion))].sort();
  return { careers: versions.join(",") };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
