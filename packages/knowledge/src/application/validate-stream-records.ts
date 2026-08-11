import {
  StreamDatasetRecordsSchema,
  type StreamDatasetRecords,
} from "@yuvanext/contracts";

export type StreamValidationIssue = {
  code:
    | "INVALID_RECORD"
    | "DUPLICATE_ID"
    | "DUPLICATE_CODE"
    | "DUPLICATE_RANK"
    | "ORPHAN_REFERENCE"
    | "DATASET_VERSION_MISMATCH"
    | "INACTIVE_PUBLISHED_REFERENCE";
  path: string;
  message: string;
};

export type StreamValidationResult =
  | { success: true; data: StreamDatasetRecords; issues: [] }
  | { success: false; issues: StreamValidationIssue[] };

export function validateStreamRecords(
  input: unknown,
  expectedDatasetVersionId: string,
): StreamValidationResult {
  const parsed = StreamDatasetRecordsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "INVALID_RECORD",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const issues: StreamValidationIssue[] = [];
  const routeIds = new Set<string>();
  const routeCodes = new Set<string>();
  const optionIds = new Set<string>();
  const optionCodes = new Set<string>();
  const mapIds = new Set<string>();
  const optionById = new Map(
    parsed.data.streamOptions.map((option) => [option.id, option]),
  );

  parsed.data.educationRoutes.forEach((route, index) => {
    addDuplicate(routeIds, route.id, `educationRoutes.${index}.id`, issues);
    addDuplicate(
      routeCodes,
      route.routeCode,
      `educationRoutes.${index}.routeCode`,
      issues,
      "DUPLICATE_CODE",
    );
  });

  parsed.data.pathways.forEach((pathway, index) => {
    if (!routeIds.has(pathway.educationRouteId)) {
      issues.push({
        code: "ORPHAN_REFERENCE",
        path: `pathways.${index}.educationRouteId`,
        message: "Pathway references an unknown education route",
      });
    }
    if (pathway.datasetVersionId !== expectedDatasetVersionId) {
      issues.push(versionIssue(`pathways.${index}.datasetVersionId`));
    }
  });

  parsed.data.streamOptions.forEach((option, index) => {
    addDuplicate(optionIds, option.id, `streamOptions.${index}.id`, issues);
    addDuplicate(
      optionCodes,
      option.streamCode,
      `streamOptions.${index}.streamCode`,
      issues,
      "DUPLICATE_CODE",
    );
  });

  parsed.data.streamMaps.forEach((map, index) => {
    addDuplicate(mapIds, map.id, `streamMaps.${index}.id`, issues);
    if (map.datasetVersionId !== expectedDatasetVersionId) {
      issues.push(versionIssue(`streamMaps.${index}.datasetVersionId`));
    }
  });

  const ranksByMap = new Set<string>();
  parsed.data.streamMapItems.forEach((item, index) => {
    if (!mapIds.has(item.mapId) || !optionIds.has(item.streamOptionId)) {
      issues.push({
        code: "ORPHAN_REFERENCE",
        path: `streamMapItems.${index}`,
        message: "Stream-map item contains an unknown map or option",
      });
    }
    const rankKey = `${item.mapId}:${item.rank}`;
    if (ranksByMap.has(rankKey)) {
      issues.push({
        code: "DUPLICATE_RANK",
        path: `streamMapItems.${index}.rank`,
        message: "Ranks must be unique within a stream map",
      });
    }
    ranksByMap.add(rankKey);

    const map = parsed.data.streamMaps.find(
      (candidate) => candidate.id === item.mapId,
    );
    const option = optionById.get(item.streamOptionId);
    if (
      map?.status === "published" &&
      option !== undefined &&
      option.status !== "active"
    ) {
      issues.push({
        code: "INACTIVE_PUBLISHED_REFERENCE",
        path: `streamMapItems.${index}.streamOptionId`,
        message: "Published maps may reference only active options",
      });
    }
  });

  return issues.length === 0
    ? { success: true, data: parsed.data, issues: [] }
    : { success: false, issues };
}

const addDuplicate = (
  values: Set<string>,
  value: string,
  path: string,
  issues: StreamValidationIssue[],
  code: StreamValidationIssue["code"] = "DUPLICATE_ID",
): void => {
  if (values.has(value)) {
    issues.push({ code, path, message: `Duplicate value: ${value}` });
  }
  values.add(value);
};

const versionIssue = (path: string): StreamValidationIssue => ({
  code: "DATASET_VERSION_MISMATCH",
  path,
  message: "Record dataset version does not match the manifest",
});
