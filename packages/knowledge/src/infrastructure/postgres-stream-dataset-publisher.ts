import {
  withTransaction,
  type createDatabasePool,
} from "@yuvanext/database";
import type { StreamDatasetPublisher } from "../application/import-stream-dataset.js";
import { DatasetVersionConflictError } from "./postgres-college-dataset-publisher.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

export class PostgresStreamDatasetPublisher
  implements StreamDatasetPublisher
{
  constructor(private readonly pool: DatabasePool) {}

  publish(
    input: Parameters<StreamDatasetPublisher["publish"]>[0],
  ): Promise<"published" | "already_published"> {
    return withTransaction(this.pool, async (client) => {
      const existing = await client.query<{ checksum: string }>(
        `select checksum from knowledge.dataset_versions
         where dataset_key = $1 and version = $2 for update`,
        [input.manifest.datasetKey, input.manifest.version],
      );
      if (existing.rows[0] !== undefined) {
        if (
          existing.rows[0].checksum !==
          input.manifest.checksumSha256
        ) {
          throw new DatasetVersionConflictError();
        }
        return "already_published";
      }

      const source = input.manifest.source;
      const sourceResult = await client.query<{ id: string }>(
        `insert into knowledge.knowledge_sources
          (id, source_key, name, source_type, base_url, publisher,
           license_ref, trust_level, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
         on conflict (source_key) do update set
           name=excluded.name, source_type=excluded.source_type,
           base_url=excluded.base_url, publisher=excluded.publisher,
           license_ref=excluded.license_ref,
           trust_level=excluded.trust_level, status=excluded.status,
           updated_at=now()
         returning id`,
        [
          source.id,
          source.sourceKey,
          source.name,
          source.sourceType,
          source.baseUrl,
          source.publisher,
          source.licenseRef,
          source.trustLevel,
          source.status,
        ],
      );
      const sourceId = sourceResult.rows[0]?.id;
      if (sourceId === undefined) {
        throw new Error("Knowledge source upsert did not return an ID");
      }

      const recordCount = Object.values(input.records).reduce(
        (total, rows) => total + rows.length,
        0,
      );
      await client.query(
        `insert into knowledge.dataset_versions
          (id, source_id, dataset_key, version, checksum, record_count,
           import_status, validation_report_json, imported_at,
           published_at, created_by)
         values ($1,$2,$3,$4,$5,$6,'staged',$7::jsonb,now(),null,null)`,
        [
          input.manifest.datasetVersionId,
          sourceId,
          input.manifest.datasetKey,
          input.manifest.version,
          input.manifest.checksumSha256,
          recordCount,
          JSON.stringify({
            schemaVersion: 1,
            recordCounts: input.manifest.recordCounts,
            issues: [],
          }),
        ],
      );

      for (const route of input.records.educationRoutes) {
        await client.query(
          `insert into knowledge.education_routes
            (id, route_code, title, route_level, description,
             publication_status)
           values ($1,$2,$3,$4,$5,$6)
           on conflict (id) do update set
             route_code=excluded.route_code, title=excluded.title,
             route_level=excluded.route_level,
             description=excluded.description,
             publication_status=excluded.publication_status`,
          [
            route.id,
            route.routeCode,
            route.title,
            route.routeLevel,
            route.description,
            route.publicationStatus,
          ],
        );
      }

      for (const pathway of input.records.pathways) {
        await client.query(
          `insert into knowledge.pathways
            (id, pathway_code, title, description, education_route_id,
             duration_band, backup_route_note, publication_status,
             dataset_version_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (id) do update set
             pathway_code=excluded.pathway_code, title=excluded.title,
             description=excluded.description,
             education_route_id=excluded.education_route_id,
             duration_band=excluded.duration_band,
             backup_route_note=excluded.backup_route_note,
             publication_status=excluded.publication_status,
             dataset_version_id=excluded.dataset_version_id`,
          [
            pathway.id,
            pathway.pathwayCode,
            pathway.title,
            pathway.description,
            pathway.educationRouteId,
            pathway.durationBand,
            pathway.backupRouteNote,
            pathway.publicationStatus,
            pathway.datasetVersionId,
          ],
        );
      }

      for (const option of input.records.streamOptions) {
        await client.query(
          `insert into knowledge.stream_options
            (id, stream_code, title, description, status)
           values ($1,$2,$3,$4,$5)
           on conflict (id) do update set
             stream_code=excluded.stream_code, title=excluded.title,
             description=excluded.description, status=excluded.status`,
          [
            option.id,
            option.streamCode,
            option.title,
            option.description,
            option.status,
          ],
        );
      }

      for (const map of input.records.streamMaps) {
        await client.query(
          `insert into knowledge.stream_maps
            (id, top_two_code, segment, version,
             dataset_version_id, status)
           values ($1,$2,$3,$4,$5,$6)`,
          [
            map.id,
            map.topTwoCode,
            map.segment,
            map.version,
            map.datasetVersionId,
            map.status,
          ],
        );
      }

      for (const item of input.records.streamMapItems) {
        await client.query(
          `insert into knowledge.stream_map_items
            (map_id, stream_option_id, rank, reason_key)
           values ($1,$2,$3,$4)`,
          [
            item.mapId,
            item.streamOptionId,
            item.rank,
            item.reasonKey,
          ],
        );
      }

      await client.query(
        `update knowledge.dataset_versions
         set import_status='published', published_at=now()
         where id=$1`,
        [input.manifest.datasetVersionId],
      );
      return "published";
    });
  }
}
