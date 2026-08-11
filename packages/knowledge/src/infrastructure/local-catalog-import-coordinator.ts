import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import type {
  CatalogImportRequest,
  CatalogImportResponse,
} from "@yuvanext/contracts";
import { CatalogImportResponseSchema } from "@yuvanext/contracts";
import type { createDatabasePool } from "@yuvanext/database";
import type { CatalogImportCoordinator } from "../application/start-catalog-import.js";
import { importAidDataset } from "../application/import-aid-dataset.js";
import { importCareerDataset } from "../application/import-career-dataset.js";
import { importCollegeDataset } from "../application/import-college-dataset.js";
import { importStreamDataset } from "../application/import-stream-dataset.js";
import { PostgresAidDatasetPublisher } from "./postgres-aid-dataset-publisher.js";
import { PostgresCareerDatasetPublisher } from "./postgres-career-dataset-publisher.js";
import { PostgresCollegeDatasetPublisher } from "./postgres-college-dataset-publisher.js";
import { PostgresStreamDatasetPublisher } from "./postgres-stream-dataset-publisher.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;
const directories = {
  "careers-poc": "data/seed/knowledge/careers/2026-07-30",
  "streams-poc": "data/seed/knowledge/streams/2026-07-31",
  "colleges-poc": "data/seed/knowledge/colleges/2026-07-31",
  "aid-schemes-poc": "data/seed/knowledge/aid-schemes/2026-08-02",
} as const;

export class LocalCatalogImportCoordinator implements CatalogImportCoordinator {
  constructor(private readonly pool: DatabasePool) {}

  async start(
    request: CatalogImportRequest,
    importId: string,
  ): Promise<CatalogImportResponse> {
    const existing = await this.getReport(importId);
    if (existing !== null) return existing;

    const directory = resolve(
      process.env.INIT_CWD ?? process.cwd(),
      directories[request.datasetKey],
    );
    const manifest = JSON.parse(
      await readFile(resolve(directory, "manifest.json"), "utf8"),
    ) as { recordsFile?: unknown };
    if (typeof manifest.recordsFile !== "string") {
      throw new Error("Allowlisted dataset manifest has no records file");
    }
    const records = await readFile(resolve(directory, manifest.recordsFile), "utf8");
    const report = await this.import(request.datasetKey, manifest, records);
    if ((report.status !== "published" && report.status !== "already_published") ||
      report.datasetVersionId === null ||
      report.datasetKey === null || report.version === null) {
      throw new Error("Catalog dataset was rejected during import");
    }
    const response: CatalogImportResponse = {
      importId,
      datasetKey: request.datasetKey,
      status: report.status,
      datasetVersionId: report.datasetVersionId,
      version: report.version,
      ...(report.recordCount === undefined ? {} : { recordCount: report.recordCount }),
      checksumSha256: report.checksumSha256,
      issues: report.issues,
    };
    await this.pool.query(
      `insert into operations.audit_events
        (id,actor_type,actor_id,action,target_type,target_id,
         request_correlation_id,safe_metadata_json,ip_hash,occurred_at)
       values ($1,'service',null,'catalog.import','dataset_version',$2,$1,$3::jsonb,null,now())
       on conflict (id) do nothing`,
      [importId, response.datasetVersionId, JSON.stringify(response)],
    );
    return response;
  }

  async getReport(importId: string): Promise<CatalogImportResponse | null> {
    const result = await this.pool.query<{ safe_metadata_json: unknown }>(
      `select safe_metadata_json from operations.audit_events
       where id=$1 and action='catalog.import'`,
      [importId],
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : CatalogImportResponseSchema.parse(row.safe_metadata_json);
  }

  private async import(datasetKey: CatalogImportRequest["datasetKey"], manifest: unknown, records: string) {
    if (datasetKey === "careers-poc") {
      const report = await importCareerDataset(manifest, records, new PostgresCareerDatasetPublisher(this.pool));
      return { ...report, recordCount: undefined };
    }
    if (datasetKey === "streams-poc") {
      const report = await importStreamDataset(manifest, records, new PostgresStreamDatasetPublisher(this.pool));
      return { ...report, recordCount: undefined };
    }
    if (datasetKey === "colleges-poc") {
      return importCollegeDataset(manifest, records, new PostgresCollegeDatasetPublisher(this.pool));
    }
    return importAidDataset(manifest, records, new PostgresAidDatasetPublisher(this.pool));
  }
}
