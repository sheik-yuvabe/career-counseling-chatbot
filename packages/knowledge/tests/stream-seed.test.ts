import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StreamDatasetManifestSchema } from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import { validateStreamRecords } from "../src/index.js";

const seedDirectory = resolve(
  "data/seed/knowledge/streams/2026-07-31",
);

describe("versioned stream seed", () => {
  it("matches its manifest, counts, references, and checksum", async () => {
    const manifest = StreamDatasetManifestSchema.parse(
      JSON.parse(
        await readFile(
          resolve(seedDirectory, "manifest.json"),
          "utf8",
        ),
      ) as unknown,
    );
    const recordsText = await readFile(
      resolve(seedDirectory, manifest.recordsFile),
      "utf8",
    );
    const validation = validateStreamRecords(
      JSON.parse(recordsText) as unknown,
      manifest.datasetVersionId,
    );

    expect(validation.success).toBe(true);
    expect(
      createHash("sha256").update(recordsText).digest("hex"),
    ).toBe(manifest.checksumSha256);
  });
});
