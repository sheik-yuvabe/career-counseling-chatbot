import { createHash } from "node:crypto";
import {
  CollegeDatasetManifestSchema,
  type College,
  type CollegeDatasetManifest,
} from "@yuvanext/contracts";
import {
  validateCollegeRecords,
  type CollegeValidationIssue,
} from "./validate-college-records.js";

export type PublishCollegeDatasetInput = {
  manifest: CollegeDatasetManifest;
  records: College[];
};

export type CollegeDatasetPublisher = {
  publish(
    input: PublishCollegeDatasetInput,
  ): Promise<"published" | "already_published">;
};

export type CollegeImportIssue = CollegeValidationIssue | {
  code:
    | "INVALID_MANIFEST"
    | "INVALID_JSON"
    | "CHECKSUM_MISMATCH"
    | "RECORD_COUNT_MISMATCH";
  path: string;
  message: string;
};

export type CollegeImportReport = {
  status: "published" | "already_published" | "rejected";
  datasetKey: string | null;
  version: string | null;
  datasetVersionId: string | null;
  recordCount: number;
  checksumSha256: string;
  issues: CollegeImportIssue[];
};

export async function importCollegeDataset(
  manifestInput: unknown,
  recordsText: string,
  publisher: CollegeDatasetPublisher,
): Promise<CollegeImportReport> {
  const checksumSha256 = createHash("sha256")
    .update(recordsText)
    .digest("hex");
  const parsedManifest =
    CollegeDatasetManifestSchema.safeParse(manifestInput);

  if (!parsedManifest.success) {
    return {
      status: "rejected",
      datasetKey: null,
      version: null,
      datasetVersionId: null,
      recordCount: 0,
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
    return rejectedReport(manifest, checksumSha256, 0, [
      {
        code: "INVALID_JSON",
        path: "records",
        message: "College records file is not valid JSON",
      },
    ]);
  }

  const validation = validateCollegeRecords(
    recordsInput,
    manifest.datasetVersionId,
  );
  const recordCount = Array.isArray(recordsInput)
    ? recordsInput.length
    : 0;
  const issues: CollegeImportIssue[] = validation.success
    ? []
    : [...validation.issues];

  if (checksumSha256 !== manifest.checksumSha256) {
    issues.push({
      code: "CHECKSUM_MISMATCH",
      path: "checksumSha256",
      message: "College records checksum does not match the manifest",
    });
  }

  if (recordCount !== manifest.recordCount) {
    issues.push({
      code: "RECORD_COUNT_MISMATCH",
      path: "recordCount",
      message: "College record count does not match the manifest",
    });
  }

  if (!validation.success || issues.length > 0) {
    return rejectedReport(
      manifest,
      checksumSha256,
      recordCount,
      issues,
    );
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
    recordCount,
    checksumSha256,
    issues: [],
  };
}

function rejectedReport(
  manifest: CollegeDatasetManifest,
  checksumSha256: string,
  recordCount: number,
  issues: CollegeImportIssue[],
): CollegeImportReport {
  return {
    status: "rejected",
    datasetKey: manifest.datasetKey,
    version: manifest.version,
    datasetVersionId: manifest.datasetVersionId,
    recordCount,
    checksumSha256,
    issues,
  };
}
