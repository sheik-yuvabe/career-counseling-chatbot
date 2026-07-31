import type {
  CollegeCatalogRecord,
  CollegeFitExplanation,
  MatchingConfig,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
} from "@yuvanext/contracts";
import { stableHash } from "./career-matching.js";

export type CollegeRecommendationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  colleges: CollegeCatalogRecord[];
  targetDisciplineIds: string[];
  selectedState?: string;
  neighboringStates?: string[];
  config: MatchingConfig;
  createdAt: string;
};

export type ScoredCollege = RecommendationItem & {
  entityType: "college";
  explanation: CollegeFitExplanation;
};

export type CollegeRings = {
  inner: ScoredCollege[];
  middle: ScoredCollege[];
  outer: ScoredCollege[];
};

export function scoreColleges(input: CollegeRecommendationInput): ScoredCollege[] {
  const targetState = input.selectedState ?? input.profile.state;
  const neighboringStates = input.neighboringStates ?? [];

  return input.colleges
    .filter((college) => college.verified)
    .map((college) => {
      const matchedDisciplineIds = input.targetDisciplineIds.filter((disciplineId) =>
        college.disciplineIds.includes(disciplineId),
      );
      const disciplineAlignment =
        input.targetDisciplineIds.length === 0
          ? 0
          : round(matchedDisciplineIds.length / input.targetDisciplineIds.length, input.config.roundingScale);
      const tierFit = round(1 / college.tier, input.config.roundingScale);
      const stateBand = resolveStateBand(college.state, targetState, neighboringStates);
      const stateFit = stateBand === "selected" ? 1 : stateBand === "neighboring" ? 0.75 : 0.4;
      const accessRouteFit = isAccessRoute(college.collegeType) ? 1 : 0.75;
      const fitScore = round(
        disciplineAlignment * 0.45 + tierFit * 0.2 + stateFit * 0.25 + accessRouteFit * 0.1,
        input.config.roundingScale,
      );

      const item: ScoredCollege = {
        itemId: `college:${college.collegeId}`,
        entityType: "college",
        entityId: college.collegeId,
        title: college.title,
        rank: 1,
        fitScore,
        explanation: {
          schemaVersion: 1 as const,
          disciplineAlignment,
          tierFit,
          stateFit,
          accessRouteFit,
          matchedDisciplineIds,
          stateBand,
          collegeType: college.collegeType,
        },
        entityDatasetVersion: college.datasetVersion,
      };

      return item;
    })
    .sort(compareScoredColleges)
    .map((college, index) => ({ ...college, rank: index + 1 }));
}

export function buildCollegeRecommendationSet(input: CollegeRecommendationInput): RecommendationSet {
  const scored = scoreColleges(input);
  const rings = partitionCollegeRings(scored);
  const ringedItems = [...rings.inner, ...rings.middle, ...rings.outer].sort(
    (left, right) => left.rank - right.rank,
  );
  const sourceDataVersions = collectSourceDataVersions(input.colleges);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    targetDisciplineIds: [...input.targetDisciplineIds].sort(),
    selectedState: input.selectedState,
    neighboringStates: [...(input.neighboringStates ?? [])].sort(),
    collegeIds: input.colleges
      .map((college) => ({
        collegeId: college.collegeId,
        datasetVersion: college.datasetVersion,
      }))
      .sort((left, right) => left.collegeId.localeCompare(right.collegeId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "college",
    items: ringedItems,
    rings,
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "college",
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

export function partitionCollegeRings(scoredColleges: ScoredCollege[]): CollegeRings {
  const candidates = scoredColleges.slice(0, 18);
  const inner = takeMatching(candidates, [], 4, (college) => college.explanation.stateBand === "selected");
  const middle = takeMatching(candidates, inner, 6, (college) => college.explanation.stateBand === "neighboring");
  const outer = takeMatching(candidates, [...inner, ...middle], 6, () => true);

  rebalanceAccessRouteOuter(inner, middle, outer);

  return {
    inner: withRing(inner, "inner"),
    middle: withRing(middle, "middle"),
    outer: withRing(outer, "outer"),
  };
}

function resolveStateBand(
  collegeState: string,
  selectedState: string | undefined,
  neighboringStates: string[],
): CollegeFitExplanation["stateBand"] {
  if (selectedState && normalizeState(collegeState) === normalizeState(selectedState)) {
    return "selected";
  }

  if (neighboringStates.some((state) => normalizeState(state) === normalizeState(collegeState))) {
    return "neighboring";
  }

  return "other";
}

function takeMatching(
  candidates: ScoredCollege[],
  alreadyTaken: ScoredCollege[],
  targetCount: number,
  predicate: (college: ScoredCollege) => boolean,
): ScoredCollege[] {
  const takenIds = new Set(alreadyTaken.map((college) => college.entityId));
  const matches = candidates.filter((college) => !takenIds.has(college.entityId) && predicate(college));

  if (matches.length >= targetCount) {
    return matches.slice(0, targetCount);
  }

  const fallback = candidates.filter(
    (college) =>
      !takenIds.has(college.entityId) &&
      !matches.some((match) => match.entityId === college.entityId),
  );

  return [...matches, ...fallback].slice(0, targetCount);
}

function rebalanceAccessRouteOuter(
  inner: ScoredCollege[],
  middle: ScoredCollege[],
  outer: ScoredCollege[],
): void {
  if (outer.some((college) => isAccessRoute(college.explanation.collegeType))) {
    return;
  }

  const accessRouteFromEarlierRing = [...middle, ...inner]
    .filter((college) => isAccessRoute(college.explanation.collegeType))
    .sort((left, right) => right.rank - left.rank)[0];

  if (!accessRouteFromEarlierRing || outer.length === 0) {
    return;
  }

  const sourceRing = middle.some((college) => college.entityId === accessRouteFromEarlierRing.entityId)
    ? middle
    : inner;
  const sourceIndex = sourceRing.findIndex(
    (college) => college.entityId === accessRouteFromEarlierRing.entityId,
  );
  const replacement = outer.shift();

  if (sourceIndex >= 0 && replacement) {
    sourceRing.splice(sourceIndex, 1, replacement);
    outer.push(accessRouteFromEarlierRing);
    sourceRing.sort((left, right) => left.rank - right.rank);
    outer.sort((left, right) => left.rank - right.rank);
  }
}

function withRing(colleges: ScoredCollege[], ring: NonNullable<ScoredCollege["ring"]>): ScoredCollege[] {
  return colleges.map((college) => ({ ...college, ring }));
}

function compareScoredColleges(left: ScoredCollege, right: ScoredCollege): number {
  const scoreDifference = (right.fitScore ?? 0) - (left.fitScore ?? 0);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const tierDifference = right.explanation.tierFit - left.explanation.tierFit;
  if (tierDifference !== 0) {
    return tierDifference;
  }

  const stateDifference = right.explanation.stateFit - left.explanation.stateFit;
  if (stateDifference !== 0) {
    return stateDifference;
  }

  const titleDifference = normalizeTitle(left.title).localeCompare(normalizeTitle(right.title), "en");
  if (titleDifference !== 0) {
    return titleDifference;
  }

  return left.entityId.localeCompare(right.entityId, "en");
}

function collectSourceDataVersions(colleges: CollegeCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(colleges.map((college) => college.datasetVersion))].sort();
  return { colleges: versions.join(",") };
}

function isAccessRoute(collegeType: CollegeCatalogRecord["collegeType"]): boolean {
  return ["vocational", "polytechnic", "iti", "open_university"].includes(collegeType);
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}

function normalizeState(state: string): string {
  return state.trim().toLocaleLowerCase("en");
}
