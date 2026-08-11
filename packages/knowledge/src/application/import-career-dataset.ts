import { createHash } from "node:crypto";
import {
  CareerDatasetManifestSchema,
  type CareerDatasetManifest,
  type CareerDatasetRecords,
} from "@yuvanext/contracts";
import {
  validateCareerRecords,
  type CareerValidationIssue,
} from "./validate-career-records.js";

export type PublishCareerDatasetInput = {
  manifest: CareerDatasetManifest;
  records: CareerDatasetRecords;
};

export interface CareerDatasetPublisher {
  publish(
    input: PublishCareerDatasetInput,
  ): Promise<"published" | "already_published">;
}

export type CareerImportIssue = CareerValidationIssue | {
  code:
    | "INVALID_MANIFEST"
    | "INVALID_JSON"
    | "CHECKSUM_MISMATCH"
    | "RECORD_COUNT_MISMATCH";
  path: string;
  message: string;
};

export type CareerImportReport = {
  status: "published" | "already_published" | "rejected";
  datasetKey: string | null;
  version: string | null;
  datasetVersionId: string | null;
  recordCounts: {
    careers: number;
    interestProfiles: number;
    profiles: number;
  };
  checksumSha256: string;
  issues: CareerImportIssue[];
};

export type CareerDatasetValidationReport = Omit<
  CareerImportReport,
  "status"
> & {
  status: "validated" | "rejected";
};

export async function validateCareerDataset(
  manifestInput: unknown,
  recordsText: string,
): Promise<CareerDatasetValidationReport> {
  const report = await importCareerDataset(
    manifestInput,
    recordsText,
    {
      publish: () => Promise.resolve("published"),
    },
  );

  return {
    ...report,
    status:
      report.status === "rejected" ? "rejected" : "validated",
  };
}

export async function importCareerDataset(
  manifestInput: unknown,
  recordsText: string,
  publisher: CareerDatasetPublisher,
): Promise<CareerImportReport> {
  const checksumSha256 = createHash("sha256")
    .update(recordsText)
    .digest("hex");
  const parsedManifest =
    CareerDatasetManifestSchema.safeParse(manifestInput);
  const emptyCounts = {
    careers: 0,
    interestProfiles: 0,
    profiles: 0,
  };

  if (!parsedManifest.success) {
    return {
      status: "rejected",
      datasetKey: null,
      version: null,
      datasetVersionId: null,
      recordCounts: emptyCounts,
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
    return rejectedReport(manifest, checksumSha256, emptyCounts, [
      {
        code: "INVALID_JSON",
        path: "records",
        message: "Career records file is not valid JSON",
      },
    ]);
  }

  const validation = validateCareerRecords(
    recordsInput,
    manifest.datasetVersionId,
  );
  const recordCounts = getRecordCounts(recordsInput);
  const issues: CareerImportIssue[] = validation.success
    ? []
    : [...validation.issues];

  if (checksumSha256 !== manifest.checksumSha256) {
    issues.push({
      code: "CHECKSUM_MISMATCH",
      path: "checksumSha256",
      message: "Career records checksum does not match the manifest",
    });
  }

  for (const key of [
    "careers",
    "interestProfiles",
    "profiles",
  ] as const) {
    if (recordCounts[key] !== manifest.recordCounts[key]) {
      issues.push({
        code: "RECORD_COUNT_MISMATCH",
        path: `recordCounts.${key}`,
        message: `${key} count does not match the manifest`,
      });
    }
  }

  if (!validation.success || issues.length > 0) {
    return rejectedReport(
      manifest,
      checksumSha256,
      recordCounts,
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
    recordCounts,
    checksumSha256,
    issues: [],
  };
}

const getRecordCounts = (
  input: unknown,
): CareerImportReport["recordCounts"] => {
  if (typeof input !== "object" || input === null) {
    return { careers: 0, interestProfiles: 0, profiles: 0 };
  }

  return {
    careers:
      "careers" in input && Array.isArray(input.careers)
        ? input.careers.length
        : 0,
    interestProfiles:
      "interestProfiles" in input &&
      Array.isArray(input.interestProfiles)
        ? input.interestProfiles.length
        : 0,
    profiles:
      "profiles" in input && Array.isArray(input.profiles)
        ? input.profiles.length
        : 0,
  };
};

const rejectedReport = (
  manifest: CareerDatasetManifest,
  checksumSha256: string,
  recordCounts: CareerImportReport["recordCounts"],
  issues: CareerImportIssue[],
): CareerImportReport => ({
  status: "rejected",
  datasetKey: manifest.datasetKey,
  version: manifest.version,
  datasetVersionId: manifest.datasetVersionId,
  recordCounts,
  checksumSha256,
  issues,
});
