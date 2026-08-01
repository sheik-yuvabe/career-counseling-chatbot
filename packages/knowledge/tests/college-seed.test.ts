import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CollegeDatasetManifestSchema,
  CollegeDatasetRecordsSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";

const seedDirectory = resolve(
  "data/seed/knowledge/colleges/2026-07-31",
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
    const records = CollegeDatasetRecordsSchema.parse(
      JSON.parse(recordsText) as unknown,
    );
    const checksum = createHash("sha256")
      .update(recordsText)
      .digest("hex");

    expect(
      records.colleges.length + records.disciplines.length +
        records.programs.length + records.pathwayDisciplines.length,
    ).toBe(manifest.recordCount);
    expect({
      colleges: records.colleges.length,
      disciplines: records.disciplines.length,
      programs: records.programs.length,
      pathwayDisciplines: records.pathwayDisciplines.length,
    }).toEqual(manifest.recordCounts);
    expect(checksum).toBe(manifest.checksumSha256);
    expect(
      records.colleges.every(
        (record) =>
          record.datasetVersionId === manifest.datasetVersionId,
      ),
    ).toBe(true);
    expect(
      records.programs.every(
        (record) => record.datasetVersionId === manifest.datasetVersionId,
      ),
    ).toBe(true);
  });
});
