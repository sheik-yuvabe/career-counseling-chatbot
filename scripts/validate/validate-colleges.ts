import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCollegeDataset } from "@yuvanext/knowledge";

const defaultDatasetDirectory =
  "data/seed/knowledge/colleges/2026-07-31";

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
  const recordsText = await readFile(
    resolve(datasetDirectory, "colleges.json"),
    "utf8",
  );
  const report = await validateCollegeDataset(
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
  process.stderr.write(`College validation failed: ${message}\n`);
  process.exitCode = 1;
});
