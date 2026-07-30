import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CareerDatasetManifestSchema } from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import { validateCareerRecords } from "../src/index.js";

const seedDirectory = resolve(
  "data/seed/knowledge/careers/2026-07-30",
);

describe("versioned career seed", () => {
  it("matches its approved manifest, counts, and checksum", async () => {
    const manifest = CareerDatasetManifestSchema.parse(
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
    const recordsInput = JSON.parse(recordsText) as unknown;
    const validation = validateCareerRecords(
      recordsInput,
      manifest.datasetVersionId,
    );

    expect(validation.success).toBe(true);
    if (!validation.success) {
      return;
    }

    expect(validation.data.careers).toHaveLength(
      manifest.recordCounts.careers,
    );
    expect(validation.data.interestProfiles).toHaveLength(
      manifest.recordCounts.interestProfiles,
    );
    expect(validation.data.profiles).toHaveLength(
      manifest.recordCounts.profiles,
    );
    expect(
      createHash("sha256").update(recordsText).digest("hex"),
    ).toBe(manifest.checksumSha256);
  });

  it("rejects orphan and unreviewed profiles", async () => {
    const records = JSON.parse(
      await readFile(
        resolve(seedDirectory, "careers.json"),
        "utf8",
      ),
    ) as {
      careers: unknown[];
      interestProfiles: unknown[];
      profiles: Array<Record<string, unknown>>;
    };
    records.profiles[0] = {
      ...records.profiles[0],
      careerId: "98888888-8888-4888-8888-888888888888",
      reviewStatus: "draft",
      lastReviewedAt: null,
    };

    const validation = validateCareerRecords(
      records,
      "93333333-3333-4333-8333-333333333333",
    );

    expect(validation.success).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ORPHAN_CAREER_PROFILE",
        "UNREVIEWED_CAREER_PROFILE",
      ]),
    );
  });
});
