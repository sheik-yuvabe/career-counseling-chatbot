import { createHash } from "node:crypto";
import {
  AidDatasetManifestSchema,
  AidSchemeSchema,
  type AidDatasetManifest,
  type AidScheme,
} from "@yuvanext/contracts";

export type AidDatasetPublisher = {
  publish(input: { manifest: AidDatasetManifest; records: AidScheme[] }):
    Promise<"published" | "already_published">;
};

export type AidImportReport = {
  status: "validated" | "published" | "already_published" | "rejected";
  datasetKey: string | null;
  version: string | null;
  datasetVersionId: string | null;
  recordCount: number;
  checksumSha256: string;
  issues: Array<{ code: string; path: string; message: string }>;
};

export async function importAidDataset(
  manifestInput: unknown,
  recordsText: string,
  publisher: AidDatasetPublisher,
): Promise<AidImportReport> {
  const checksumSha256 = createHash("sha256").update(recordsText).digest("hex");
  const manifestResult = AidDatasetManifestSchema.safeParse(manifestInput);
  if (!manifestResult.success) return invalid(null, checksumSha256, 0,
    manifestResult.error.issues.map((issue) => ({
      code: "INVALID_MANIFEST", path: issue.path.join("."), message: issue.message,
    })));
  const manifest = manifestResult.data;
  let input: unknown;
  try { input = JSON.parse(recordsText) as unknown; } catch {
    return invalid(manifest, checksumSha256, 0, [{
      code: "INVALID_JSON", path: "records", message: "Aid records file is not valid JSON",
    }]);
  }
  const recordsResult = AidSchemeSchema.array().safeParse(input);
  const records = recordsResult.success ? recordsResult.data : [];
  const issues: AidImportReport["issues"] = recordsResult.success ? [] :
    recordsResult.error.issues.map((issue) => ({
      code: "INVALID_RECORD", path: issue.path.join("."), message: issue.message,
    }));
  const ids = new Set<string>();
  records.forEach((record, index) => {
    if (ids.has(record.id)) issues.push({ code: "DUPLICATE_ID", path: `${index}.id`, message: `Duplicate aid ID: ${record.id}` });
    ids.add(record.id);
    if (record.datasetVersionId !== manifest.datasetVersionId) issues.push({ code: "DATASET_VERSION_MISMATCH", path: `${index}.datasetVersionId`, message: "Aid dataset version does not match the manifest" });
  });
  if (checksumSha256 !== manifest.checksumSha256) issues.push({ code: "CHECKSUM_MISMATCH", path: "checksumSha256", message: "Aid records checksum does not match the manifest" });
  if (records.length !== manifest.recordCount) issues.push({ code: "RECORD_COUNT_MISMATCH", path: "recordCount", message: "Aid record count does not match the manifest" });
  if (!recordsResult.success || issues.length > 0) return invalid(manifest, checksumSha256, records.length, issues);
  const status = await publisher.publish({ manifest, records });
  return { status, datasetKey: manifest.datasetKey, version: manifest.version,
    datasetVersionId: manifest.datasetVersionId, recordCount: records.length,
    checksumSha256, issues: [] };
}

export async function validateAidDataset(manifest: unknown, records: string): Promise<AidImportReport> {
  const report = await importAidDataset(manifest, records, { publish: () => Promise.resolve("published") });
  return { ...report, status: report.status === "rejected" ? "rejected" : "validated" };
}

const invalid = (manifest: AidDatasetManifest | null, checksumSha256: string,
  recordCount: number, issues: AidImportReport["issues"]): AidImportReport => ({
  status: "rejected", datasetKey: manifest?.datasetKey ?? null,
  version: manifest?.version ?? null, datasetVersionId: manifest?.datasetVersionId ?? null,
  recordCount, checksumSha256, issues,
});
