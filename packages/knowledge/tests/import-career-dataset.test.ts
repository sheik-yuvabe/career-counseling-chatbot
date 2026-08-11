import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type CareerDatasetPublisher,
  importCareerDataset,
} from "../src/index.js";

const seedDirectory = resolve(
  "data/seed/knowledge/careers/2026-07-30",
);

const readValidSeed = async () => ({
  manifest: JSON.parse(
    await readFile(resolve(seedDirectory, "manifest.json"), "utf8"),
  ) as unknown,
  recordsText: await readFile(
    resolve(seedDirectory, "careers.json"),
    "utf8",
  ),
});

describe("importCareerDataset", () => {
  it("publishes a valid career dataset", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CareerDatasetPublisher["publish"]>()
        .mockResolvedValue("published");

    const report = await importCareerDataset(
      manifest,
      recordsText,
      { publish },
    );

    expect(report.status).toBe("published");
    expect(report.recordCounts).toEqual({
      careers: 2,
      interestProfiles: 1,
      profiles: 1,
    });
    expect(publish).toHaveBeenCalledOnce();
  });

  it("reports an idempotent repeated publication", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CareerDatasetPublisher["publish"]>()
        .mockResolvedValue("already_published");

    const report = await importCareerDataset(
      manifest,
      recordsText,
      { publish },
    );

    expect(report.status).toBe("already_published");
  });

  it("rejects a changed file before publication", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CareerDatasetPublisher["publish"]>()
        .mockResolvedValue("published");

    const report = await importCareerDataset(
      manifest,
      `${recordsText}\n`,
      { publish },
    );

    expect(report.status).toBe("rejected");
    expect(report.issues.map((issue) => issue.code)).toContain(
      "CHECKSUM_MISMATCH",
    );
    expect(publish).not.toHaveBeenCalled();
  });
});
