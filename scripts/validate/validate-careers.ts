import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CareerDatasetManifestSchema } from "@yuvanext/contracts";
import { validateCareerDataset } from "@yuvanext/knowledge";

const defaultDatasetDirectory =
  "data/seed/knowledge/careers/2026-07-30";

const run = async (): Promise<void> => {
  const datasetArgument = process.argv
    .slice(2)
    .find((argument) => argument !== "--");
  const datasetDirectory = resolve(
    datasetArgument ?? defaultDatasetDirectory,
  );
  const manifestInput = JSON.parse(
    await readFile(resolve(datasetDirectory, "manifest.json"), "utf8"),
  ) as unknown;
  const manifest = CareerDatasetManifestSchema.parse(manifestInput);
  const recordsText = await readFile(
    resolve(datasetDirectory, manifest.recordsFile),
    "utf8",
  );
  const report = await validateCareerDataset(
    manifestInput,
    recordsText,
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.status === "rejected") {
    process.exitCode = 1;
  }
};

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown validation failure";
  process.stderr.write(`Career validation failed: ${message}\n`);
  process.exitCode = 1;
});
