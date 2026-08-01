import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CollegeDatasetManifestSchema } from "@yuvanext/contracts";
import { createDatabasePool } from "@yuvanext/database";
import {
  importCollegeDataset,
  PostgresCollegeDatasetPublisher,
} from "@yuvanext/knowledge";

const defaultDatasetDirectory =
  "data/seed/knowledge/colleges/2026-07-31";

const loadLocalEnvironment = (): void => {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
};

const run = async (): Promise<void> => {
  loadLocalEnvironment();

  const argumentsList = process.argv.slice(2);
  const publishRequested = argumentsList.includes("--publish");
  const datasetArgument = argumentsList.find(
    (argument) => !argument.startsWith("--"),
  );

  if (!publishRequested) {
    throw new Error(
      "Import refused: pass --publish to allow database writes",
    );
  }

  if (process.env.DATABASE_URL === undefined) {
    throw new Error("DATABASE_URL is required for catalog import");
  }

  const datasetDirectory = resolve(
    datasetArgument ?? defaultDatasetDirectory,
  );
  const manifestInput = JSON.parse(
    await readFile(resolve(datasetDirectory, "manifest.json"), "utf8"),
  ) as unknown;
  const manifest = CollegeDatasetManifestSchema.parse(manifestInput);
  const recordsText = await readFile(
    resolve(datasetDirectory, manifest.recordsFile),
    "utf8",
  );
  const pool = createDatabasePool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== "false",
    max: 1,
  });

  try {
    const report = await importCollegeDataset(
      manifest,
      recordsText,
      new PostgresCollegeDatasetPublisher(pool),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (report.status === "rejected") {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
};

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown import failure";
  process.stderr.write(`College import failed: ${message}\n`);
  process.exitCode = 1;
});
