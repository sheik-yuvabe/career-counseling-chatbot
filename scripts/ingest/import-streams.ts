import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StreamDatasetManifestSchema } from "@yuvanext/contracts";
import { createDatabasePool } from "@yuvanext/database";
import {
  importStreamDataset,
  PostgresStreamDatasetPublisher,
} from "@yuvanext/knowledge";

const directory = "data/seed/knowledge/streams/2026-07-31";

const run = async (): Promise<void> => {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const args = process.argv.slice(2);
  if (!args.includes("--publish")) {
    throw new Error(
      "Import refused: pass --publish to allow database writes",
    );
  }
  if (process.env.DATABASE_URL === undefined) {
    throw new Error("DATABASE_URL is required for catalog import");
  }

  const datasetDirectory = resolve(
    args.find(
      (value) => value !== "--" && !value.startsWith("--"),
    ) ?? directory,
  );
  const manifestInput = JSON.parse(
    await readFile(resolve(datasetDirectory, "manifest.json"), "utf8"),
  ) as unknown;
  const manifest = StreamDatasetManifestSchema.parse(manifestInput);
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
    const report = await importStreamDataset(
      manifestInput,
      recordsText,
      new PostgresStreamDatasetPublisher(pool),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.status === "rejected") process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(
    `Stream import failed: ${
      error instanceof Error ? error.message : "Unknown failure"
    }\n`,
  );
  process.exitCode = 1;
});
