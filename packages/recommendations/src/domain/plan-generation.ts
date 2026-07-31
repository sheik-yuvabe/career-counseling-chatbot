import type {
  GeneratedPlanStep,
  MatchingConfig,
  PlanFitExplanation,
  PlanTemplateCatalogRecord,
  ProfileSnapshotForRecommendations,
  RecommendationItem,
  RecommendationSet,
} from "@yuvanext/contracts";
import { stableHash } from "./career-matching.js";

export type PlanTarget = {
  entityType: "career" | "stream" | "pathway";
  entityId: string;
  title: string;
};

export type PlanGenerationInput = {
  recommendationId: string;
  profile: ProfileSnapshotForRecommendations;
  templates: PlanTemplateCatalogRecord[];
  target?: PlanTarget;
  config: MatchingConfig;
  createdAt: string;
};

export type GeneratedPlanItem = RecommendationItem & {
  entityType: "plan";
  explanation: PlanFitExplanation;
};

export function generatePlan(input: PlanGenerationInput): GeneratedPlanItem {
  const template = selectPlanTemplate(input);
  const generatedSteps = template.steps
    .slice()
    .sort((left, right) => left.stepOrder - right.stepOrder)
    .map((step): GeneratedPlanStep => ({
      stepOrder: step.stepOrder,
      timeWindow: step.timeWindow,
      actionText: renderTemplate(step.actionTemplate, input.profile, input.target),
      isOptional: step.isOptional,
    }));

  return {
    itemId: `plan:${template.planTemplateId}`,
    entityType: "plan",
    entityId: template.planTemplateId,
    title: template.title,
    rank: 1,
    explanation: {
      schemaVersion: 1 as const,
      templateId: template.planTemplateId,
      planType: template.planType,
      segment: template.segment,
      ...(input.target
        ? {
            targetEntityType: input.target.entityType,
            targetEntityId: input.target.entityId,
          }
        : {}),
      catalogPriority: template.priority,
      generatedSteps,
    },
    entityDatasetVersion: template.datasetVersion,
  };
}

export function buildPlanRecommendationSet(input: PlanGenerationInput): RecommendationSet {
  const item = generatePlan(input);
  const sourceDataVersions = collectSourceDataVersions(input.templates);
  const inputHash = stableHash({
    profile: input.profile,
    config: input.config,
    target: input.target,
    templateIds: input.templates
      .map((template) => ({
        planTemplateId: template.planTemplateId,
        datasetVersion: template.datasetVersion,
      }))
      .sort((left, right) => left.planTemplateId.localeCompare(right.planTemplateId, "en")),
    sourceDataVersions,
  });
  const outputHash = stableHash({
    kind: "plan",
    items: [item],
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
  });

  return {
    recommendationId: input.recommendationId,
    profileSnapshotId: input.profile.profileSnapshotId,
    kind: "plan",
    items: [item],
    algorithmVersion: input.config.algorithmVersion,
    weightsVersion: input.config.weightsVersion,
    sourceDataVersions,
    inputHash,
    outputHash,
    createdAt: input.createdAt,
  };
}

function selectPlanTemplate(input: PlanGenerationInput): PlanTemplateCatalogRecord {
  const planType = planTypeForSegment(input.profile.segment);
  const candidates = input.templates
    .filter((template) => template.verified)
    .filter((template) => template.segment === input.profile.segment)
    .filter((template) => template.planType === planType)
    .filter((template) => {
      if (!template.targetEntityType) {
        return true;
      }

      return template.targetEntityType === input.target?.entityType;
    })
    .sort(compareTemplates);

  const selected = candidates[0];
  if (!selected) {
    throw new Error(`No approved plan template for ${input.profile.segment}`);
  }

  return selected;
}

function planTypeForSegment(segment: ProfileSnapshotForRecommendations["segment"]): PlanTemplateCatalogRecord["planType"] {
  if (segment === "explorer") {
    return "exploration";
  }

  if (segment === "pathfinder") {
    return "pathway";
  }

  return "career_90_day";
}

function renderTemplate(
  template: string,
  profile: ProfileSnapshotForRecommendations,
  target: PlanTarget | undefined,
): string {
  const values: Record<string, string> = {
    segment: profile.segment,
    state: profile.state ?? "your state",
    targetTitle: target?.title ?? "your recommended option",
    targetType: target?.entityType ?? "option",
  };

  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

function compareTemplates(
  left: PlanTemplateCatalogRecord,
  right: PlanTemplateCatalogRecord,
): number {
  const priorityDifference = left.priority - right.priority;
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const titleDifference = normalizeTitle(left.title).localeCompare(normalizeTitle(right.title), "en");
  if (titleDifference !== 0) {
    return titleDifference;
  }

  return left.planTemplateId.localeCompare(right.planTemplateId, "en");
}

function collectSourceDataVersions(templates: PlanTemplateCatalogRecord[]): Record<string, string> {
  const versions = [...new Set(templates.map((template) => template.datasetVersion))].sort();
  return { planTemplates: versions.join(",") };
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase("en");
}
