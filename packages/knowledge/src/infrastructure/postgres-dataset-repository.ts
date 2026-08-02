import { PublishedDatasetSchema, type PublishedDataset } from "@yuvanext/contracts";
import type { DatasetRepository } from "../domain/dataset.js";

type QueryExecutor = {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
};

export class PostgresDatasetRepository implements DatasetRepository {
  constructor(private readonly database: QueryExecutor) {}

  async listPublished(): Promise<readonly PublishedDataset[]> {
    const result = await this.database.query(
      `select dataset.id::text as "id", dataset.dataset_key as "datasetKey",
        dataset.version, dataset.checksum as "checksumSha256",
        dataset.record_count as "recordCount", dataset.published_at as "publishedAt",
        jsonb_build_object(
          'sourceKey', source.source_key,
          'name', source.name,
          'publisher', source.publisher,
          'trustLevel', source.trust_level
        ) as source
      from knowledge.dataset_versions dataset
      join knowledge.knowledge_sources source on source.id = dataset.source_id
      where dataset.import_status = 'published'
        and dataset.published_at is not null
      order by dataset.dataset_key, dataset.published_at desc, dataset.version desc`,
    );
    return result.rows.map((row) => PublishedDatasetSchema.parse({
      ...row,
      publishedAt: row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : row.publishedAt,
    }));
  }
}
