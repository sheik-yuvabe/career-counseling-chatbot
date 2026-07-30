import {
  withTransaction,
  type createDatabasePool,
} from "@yuvanext/database";
import type {
  CareerDatasetPublisher,
  PublishCareerDatasetInput,
} from "../application/import-career-dataset.js";
import { DatasetVersionConflictError } from "./postgres-college-dataset-publisher.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

export class PostgresCareerDatasetPublisher
  implements CareerDatasetPublisher
{
  constructor(private readonly pool: DatabasePool) {}

  publish(
    input: PublishCareerDatasetInput,
  ): Promise<"published" | "already_published"> {
    return withTransaction(this.pool, async (client) => {
      const existing = await client.query<{
        checksum: string;
        import_status: string;
      }>(
        `
          select checksum, import_status
          from knowledge.dataset_versions
          where dataset_key = $1 and version = $2
          for update
        `,
        [input.manifest.datasetKey, input.manifest.version],
      );
      const existingVersion = existing.rows[0];

      if (existingVersion !== undefined) {
        if (
          existingVersion.checksum !==
          input.manifest.checksumSha256
        ) {
          throw new DatasetVersionConflictError();
        }
        return "already_published";
      }

      const sourceResult = await client.query<{ id: string }>(
        `
          insert into knowledge.knowledge_sources (
            id, source_key, name, source_type, base_url, publisher,
            license_ref, trust_level, status, created_at, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
          on conflict (source_key) do update
          set
            name = excluded.name,
            source_type = excluded.source_type,
            base_url = excluded.base_url,
            publisher = excluded.publisher,
            license_ref = excluded.license_ref,
            trust_level = excluded.trust_level,
            status = excluded.status,
            updated_at = now()
          returning id
        `,
        [
          input.manifest.source.id,
          input.manifest.source.sourceKey,
          input.manifest.source.name,
          input.manifest.source.sourceType,
          input.manifest.source.baseUrl,
          input.manifest.source.publisher,
          input.manifest.source.licenseRef,
          input.manifest.source.trustLevel,
          input.manifest.source.status,
        ],
      );
      const sourceId = sourceResult.rows[0]?.id;

      if (sourceId === undefined) {
        throw new Error("Knowledge source upsert did not return an ID");
      }

      const totalRecordCount =
        input.records.careers.length +
        input.records.interestProfiles.length +
        input.records.profiles.length;

      await client.query(
        `
          insert into knowledge.dataset_versions (
            id, source_id, dataset_key, version, checksum, record_count,
            import_status, validation_report_json, imported_at,
            published_at, created_by
          )
          values (
            $1, $2, $3, $4, $5, $6, 'staged', $7::jsonb, now(), null, null
          )
        `,
        [
          input.manifest.datasetVersionId,
          sourceId,
          input.manifest.datasetKey,
          input.manifest.version,
          input.manifest.checksumSha256,
          totalRecordCount,
          JSON.stringify({
            schemaVersion: 1,
            recordCounts: input.manifest.recordCounts,
            issues: [],
          }),
        ],
      );

      for (const career of input.records.careers) {
        await client.query(
          `
            insert into knowledge.careers (
              id, onet_code, nco_code, slug, title, short_description,
              domain_code, primary_education_route_id, is_curated,
              publication_status, dataset_version_id, published_at,
              retired_at, created_at, updated_at
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              $12, $13, now(), now()
            )
          `,
          [
            career.id,
            career.onetCode,
            career.ncoCode,
            career.slug,
            career.title,
            career.shortDescription,
            career.domainCode,
            career.primaryEducationRouteId,
            career.isCurated,
            career.publicationStatus,
            career.datasetVersionId,
            career.publishedAt,
            career.retiredAt,
          ],
        );
      }

      for (const profile of input.records.interestProfiles) {
        await client.query(
          `
            insert into knowledge.career_interest_profiles (
              career_id, realistic, investigative, artistic, social,
              enterprising, conventional, high_point_code,
              profile_version, dataset_version_id
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            profile.careerId,
            profile.realistic,
            profile.investigative,
            profile.artistic,
            profile.social,
            profile.enterprising,
            profile.conventional,
            profile.highPointCode,
            profile.profileVersion,
            profile.datasetVersionId,
          ],
        );
      }

      for (const profile of input.records.profiles) {
        await client.query(
          `
            insert into knowledge.career_profiles (
              career_id, image_ref, salary_entry_band, salary_note,
              skills, next_role_3yr, progression_note, review_status,
              last_reviewed_at, reviewed_by
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            profile.careerId,
            profile.imageRef,
            profile.salaryEntryBand,
            profile.salaryNote,
            profile.skills,
            profile.nextRole3yr,
            profile.progressionNote,
            profile.reviewStatus,
            profile.lastReviewedAt,
            profile.reviewedBy,
          ],
        );
      }

      await client.query(
        `
          update knowledge.dataset_versions
          set import_status = 'published', published_at = now()
          where id = $1
        `,
        [input.manifest.datasetVersionId],
      );

      return "published";
    });
  }
}
