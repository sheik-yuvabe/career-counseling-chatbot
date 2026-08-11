import { createHash } from "node:crypto";
import {
  StreamDatasetManifestSchema,
  type StreamDatasetManifest,
  type StreamDatasetRecords,
} from "@yuvanext/contracts";
import {
  validateStreamRecords,
  type StreamValidationIssue,
} from "./validate-stream-records.js";

export type StreamDatasetPublisher = {
  publish(input: {
    manifest: StreamDatasetManifest;
    records: StreamDatasetRecords;
  }): Promise<"published" | "already_published">;
};

export type StreamImportReport = {
  status: "validated" | "published" | "already_published" | "rejected";
  datasetKey: string | null;
  version: string | null;
  datasetVersionId: string | null;
  checksumSha256: string;
  issues: Array<
    StreamValidationIssue | {
      code:
        | "INVALID_MANIFEST"
        | "INVALID_JSON"
        | "CHECKSUM_MISMATCH"
        | "RECORD_COUNT_MISMATCH";
      path: string;
      message: string;
    }
  >;
};

export async function importStreamDataset(
  manifestInput: unknown,
  recordsText: string,
  publisher: StreamDatasetPublisher,
): Promise<StreamImportReport> {
  const checksumSha256 = createHash("sha256")
    .update(recordsText)
    .digest("hex");
  const parsedManifest =
    StreamDatasetManifestSchema.safeParse(manifestInput);
  if (!parsedManifest.success) {
    return {
      status: "rejected",
      datasetKey: null,
      version: null,
      datasetVersionId: null,
      checksumSha256,
      issues: parsedManifest.error.issues.map((issue) => ({
        code: "INVALID_MANIFEST",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const manifest = parsedManifest.data;
  let recordsInput: unknown;
  try {
    recordsInput = JSON.parse(recordsText) as unknown;
  } catch {
    return rejected(manifest, checksumSha256, [{
      code: "INVALID_JSON",
      path: "records",
      message: "Stream records file is not valid JSON",
    }]);
  }

  const validation = validateStreamRecords(
    recordsInput,
    manifest.datasetVersionId,
  );
  const issues: StreamImportReport["issues"] = validation.success
    ? []
    : [...validation.issues];

  if (checksumSha256 !== manifest.checksumSha256) {
    issues.push({
      code: "CHECKSUM_MISMATCH",
      path: "checksumSha256",
      message: "Stream records checksum does not match the manifest",
    });
  }

  if (validation.success) {
    for (const key of Object.keys(
      manifest.recordCounts,
    ) as Array<keyof typeof manifest.recordCounts>) {
      if (
        validation.data[key].length !== manifest.recordCounts[key]
      ) {
        issues.push({
          code: "RECORD_COUNT_MISMATCH",
          path: `recordCounts.${key}`,
          message: `${key} count does not match the manifest`,
        });
      }
    }
  }

  if (!validation.success || issues.length > 0) {
    return rejected(manifest, checksumSha256, issues);
  }

  const status = await publisher.publish({
    manifest,
    records: validation.data,
  });
  return {
    status,
    datasetKey: manifest.datasetKey,
    version: manifest.version,
    datasetVersionId: manifest.datasetVersionId,
    checksumSha256,
    issues: [],
  };
}

export async function validateStreamDataset(
  manifestInput: unknown,
  recordsText: string,
): Promise<StreamImportReport> {
  const report = await importStreamDataset(
    manifestInput,
    recordsText,
    { publish: () => Promise.resolve("published") },
  );
  return {
    ...report,
    status:
      report.status === "rejected" ? "rejected" : "validated",
  };
}

const rejected = (
  manifest: StreamDatasetManifest,
  checksumSha256: string,
  issues: StreamImportReport["issues"],
): StreamImportReport => ({
  status: "rejected",
  datasetKey: manifest.datasetKey,
  version: manifest.version,
  datasetVersionId: manifest.datasetVersionId,
  checksumSha256,
  issues,
});
