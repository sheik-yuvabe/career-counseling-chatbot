import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StreamDatasetManifestSchema } from "@yuvanext/contracts";
import { validateStreamDataset } from "@yuvanext/knowledge";

const directory = "data/seed/knowledge/streams/2026-07-31";

const run = async (): Promise<void> => {
  const datasetDirectory = resolve(
    process.argv.slice(2).find((value) => value !== "--") ??
      directory,
  );
  const manifestInput = JSON.parse(
    await readFile(resolve(datasetDirectory, "manifest.json"), "utf8"),
  ) as unknown;
  const manifest = StreamDatasetManifestSchema.parse(manifestInput);
  const recordsText = await readFile(
    resolve(datasetDirectory, manifest.recordsFile),
    "utf8",
  );
  const report = await validateStreamDataset(
    manifestInput,
    recordsText,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "rejected") process.exitCode = 1;
};

run().catch((error: unknown) => {
  process.stderr.write(
    `Stream validation failed: ${
      error instanceof Error ? error.message : "Unknown failure"
    }\n`,
  );
  process.exitCode = 1;
});
