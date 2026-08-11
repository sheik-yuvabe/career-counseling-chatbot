import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { AidDatasetManifestSchema } from "@yuvanext/contracts";
import { validateAidDataset } from "@yuvanext/knowledge";

const directory = resolve("data/seed/knowledge/aid-schemes/2026-08-02");
const manifestInput = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8")) as unknown;
const manifest = AidDatasetManifestSchema.parse(manifestInput);
const records = await readFile(resolve(directory, manifest.recordsFile), "utf8");
const report = await validateAidDataset(manifestInput, records);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status === "rejected") process.exitCode = 1;
