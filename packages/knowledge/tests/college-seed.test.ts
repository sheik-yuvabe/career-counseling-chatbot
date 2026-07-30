import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CollegeDatasetManifestSchema,
  CollegeSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";

const seedDirectory = resolve(
  "data/seed/knowledge/colleges/2026-07-30",
);

describe("versioned college seed", () => {
  it("matches its approved manifest and checksum", async () => {
    const manifestText = await readFile(
      resolve(seedDirectory, "manifest.json"),
      "utf8",
    );
    const manifest = CollegeDatasetManifestSchema.parse(
      JSON.parse(manifestText) as unknown,
    );
    const recordsText = await readFile(
      resolve(seedDirectory, manifest.recordsFile),
      "utf8",
    );
    const records = CollegeSchema.array().parse(
      JSON.parse(recordsText) as unknown,
    );
    const checksum = createHash("sha256")
      .update(recordsText)
      .digest("hex");

    expect(records).toHaveLength(manifest.recordCount);
    expect(checksum).toBe(manifest.checksumSha256);
    expect(
      records.every(
        (record) =>
          record.datasetVersionId === manifest.datasetVersionId,
      ),
    ).toBe(true);
  });
});
