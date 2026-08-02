import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { importAidDataset, validateAidDataset, type AidDatasetPublisher } from "../src/index.js";

const directory = resolve("data/seed/knowledge/aid-schemes/2026-08-02");
const loadSeed = async () => ({
  manifest: JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as unknown,
  records: await readFile(resolve(directory, "aid-schemes.json"), "utf8"),
});

describe("aid dataset import", () => {
  it("validates the approved seed", async () => {
    const seed = await loadSeed();
    const report = await validateAidDataset(seed.manifest, seed.records);
    expect(report.status).toBe("validated");
    expect(report.recordCount).toBe(3);
    expect(report.issues).toEqual([]);
  });

  it("rejects a checksum change before publication", async () => {
    const seed = await loadSeed();
    const publish = vi.fn<AidDatasetPublisher["publish"]>().mockResolvedValue("published");
    const report = await importAidDataset(seed.manifest, `${seed.records}\n`, { publish });
    expect(report.status).toBe("rejected");
    expect(report.issues.map(({ code }) => code)).toContain("CHECKSUM_MISMATCH");
    expect(publish).not.toHaveBeenCalled();
  });
});
