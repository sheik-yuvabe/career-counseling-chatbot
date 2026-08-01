import { withTransaction, type createDatabasePool } from "@yuvanext/database";
import type { AidDatasetPublisher } from "../application/import-aid-dataset.js";
import { DatasetVersionConflictError } from "./postgres-college-dataset-publisher.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

export class PostgresAidDatasetPublisher implements AidDatasetPublisher {
  constructor(private readonly pool: DatabasePool) {}

  publish(input: Parameters<AidDatasetPublisher["publish"]>[0]): Promise<"published" | "already_published"> {
    return withTransaction(this.pool, async (client) => {
      const existing = await client.query<{ checksum: string }>(
        "select checksum from knowledge.dataset_versions where dataset_key=$1 and version=$2 for update",
        [input.manifest.datasetKey, input.manifest.version],
      );
      if (existing.rows[0] !== undefined) {
        if (existing.rows[0].checksum !== input.manifest.checksumSha256) throw new DatasetVersionConflictError();
        return "already_published";
      }
      const source = input.manifest.source;
      const sourceResult = await client.query<{ id: string }>(
        `insert into knowledge.knowledge_sources
          (id,source_key,name,source_type,base_url,publisher,license_ref,trust_level,status,created_at,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
         on conflict (source_key) do update set name=excluded.name,updated_at=now()
         returning id`,
        [source.id, source.sourceKey, source.name, source.sourceType, source.baseUrl,
          source.publisher, source.licenseRef, source.trustLevel, source.status],
      );
      const sourceId = sourceResult.rows[0]?.id;
      if (sourceId === undefined) throw new Error("Knowledge source upsert did not return an ID");
      await client.query(
        `insert into knowledge.dataset_versions
          (id,source_id,dataset_key,version,checksum,record_count,import_status,
           validation_report_json,imported_at,published_at,created_by)
         values ($1,$2,$3,$4,$5,$6,'staged',$7::jsonb,now(),null,null)`,
        [input.manifest.datasetVersionId, sourceId, input.manifest.datasetKey,
          input.manifest.version, input.manifest.checksumSha256, input.records.length,
          JSON.stringify({ schemaVersion: 1, issues: [] })],
      );
      for (const aid of input.records) {
        await client.query(
          `insert into knowledge.aid_schemes
            (id,aid_code,name,provider_type,provider,level,states,eligibility_summary,
             benefit_summary,amount_text,application_url,portal_name,apply_window_start,
             apply_window_end,verification_status,last_verified_at,dataset_version_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           on conflict (id) do update set name=excluded.name,provider_type=excluded.provider_type,
             provider=excluded.provider,level=excluded.level,states=excluded.states,
             eligibility_summary=excluded.eligibility_summary,benefit_summary=excluded.benefit_summary,
             amount_text=excluded.amount_text,application_url=excluded.application_url,
             portal_name=excluded.portal_name,apply_window_start=excluded.apply_window_start,
             apply_window_end=excluded.apply_window_end,verification_status=excluded.verification_status,
             last_verified_at=excluded.last_verified_at,dataset_version_id=excluded.dataset_version_id`,
          [aid.id, aid.aidCode, aid.name, aid.providerType, aid.provider, aid.level, aid.states,
            aid.eligibilitySummary, aid.benefitSummary, aid.amountText, aid.applicationUrl,
            aid.portalName, aid.applyWindowStart, aid.applyWindowEnd, aid.verificationStatus,
            aid.lastVerifiedAt, aid.datasetVersionId],
        );
      }
      await client.query("update knowledge.dataset_versions set import_status='published',published_at=now() where id=$1", [input.manifest.datasetVersionId]);
      return "published";
    });
  }
}
