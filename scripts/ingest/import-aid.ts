import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { AidDatasetManifestSchema } from "@yuvanext/contracts";
import { createDatabasePool } from "@yuvanext/database";
import { importAidDataset, PostgresAidDatasetPublisher } from "@yuvanext/knowledge";

process.loadEnvFile(resolve(process.env.INIT_CWD ?? process.cwd(), ".env"));
if (!process.argv.includes("--publish")) throw new Error("Import refused: pass --publish to allow database writes");
if (process.env.DATABASE_URL === undefined) throw new Error("DATABASE_URL is required for catalog import");
const directory = resolve("data/seed/knowledge/aid-schemes/2026-08-01");
const manifestInput = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as unknown;
const manifest = AidDatasetManifestSchema.parse(manifestInput);
const records = await readFile(resolve(directory, manifest.recordsFile), "utf8");
const pool = createDatabasePool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL !== "false", max: 1 });
try {
  const report = await importAidDataset(manifestInput, records, new PostgresAidDatasetPublisher(pool));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "rejected") process.exitCode = 1;
} finally { await pool.end(); }
