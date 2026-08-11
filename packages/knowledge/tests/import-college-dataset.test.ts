import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type CollegeDatasetPublisher,
  importCollegeDataset,
  validateCollegeDataset,
} from "../src/index.js";

const seedDirectory = resolve(
  "data/seed/knowledge/colleges/2026-07-31",
);

const readValidSeed = async () => {
  const manifest = JSON.parse(
    await readFile(resolve(seedDirectory, "manifest.json"), "utf8"),
  ) as unknown;
  const recordsText = await readFile(
    resolve(seedDirectory, "colleges.json"),
    "utf8",
  );

  return { manifest, recordsText };
};

describe("importCollegeDataset", () => {
  it("validates a dataset without invoking a publisher", async () => {
    const { manifest, recordsText } = await readValidSeed();

    const report = await validateCollegeDataset(
      manifest,
      recordsText,
    );

    expect(report.status).toBe("validated");
    expect(report.recordCount).toBe(8);
    expect(report.issues).toEqual([]);
  });

  it("publishes a valid, reviewed dataset", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CollegeDatasetPublisher["publish"]>()
        .mockResolvedValue("published");

    const report = await importCollegeDataset(
      manifest,
      recordsText,
      { publish },
    );

    expect(report.status).toBe("published");
    expect(report.recordCount).toBe(8);
    expect(report.issues).toEqual([]);
    expect(publish).toHaveBeenCalledOnce();
  });

  it("reports an idempotent repeated publication", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CollegeDatasetPublisher["publish"]>()
        .mockResolvedValue("already_published");

    const report = await importCollegeDataset(
      manifest,
      recordsText,
      { publish },
    );

    expect(report.status).toBe("already_published");
    expect(publish).toHaveBeenCalledOnce();
  });

  it("rejects a changed file before any database write", async () => {
    const { manifest, recordsText } = await readValidSeed();
    const publish =
      vi.fn<CollegeDatasetPublisher["publish"]>()
        .mockResolvedValue("published");

    const report = await importCollegeDataset(
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
