import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  importStreamDataset,
  type StreamDatasetPublisher,
} from "../src/index.js";

const directory = resolve(
  "data/seed/knowledge/streams/2026-07-31",
);

describe("importStreamDataset", () => {
  it("publishes valid records and rejects changed files", async () => {
    const manifest = JSON.parse(
      await readFile(resolve(directory, "manifest.json"), "utf8"),
    ) as unknown;
    const records = await readFile(
      resolve(directory, "streams.json"),
      "utf8",
    );
    const publish =
      vi.fn<StreamDatasetPublisher["publish"]>()
        .mockResolvedValue("published");

    const valid = await importStreamDataset(manifest, records, {
      publish,
    });
    const changed = await importStreamDataset(
      manifest,
      `${records}\n`,
      { publish },
    );

    expect(valid.status).toBe("published");
    expect(changed.status).toBe("rejected");
    expect(publish).toHaveBeenCalledOnce();
  });
});
