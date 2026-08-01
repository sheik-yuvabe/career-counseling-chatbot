import {
  withTransaction,
  type createDatabasePool,
} from "@yuvanext/database";
import type {
  CollegeDatasetPublisher,
  PublishCollegeDatasetInput,
} from "../application/import-college-dataset.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;

export class DatasetVersionConflictError extends Error {
  constructor() {
    super("Dataset version already exists with a different checksum");
    this.name = "DatasetVersionConflictError";
  }
}

export class PostgresCollegeDatasetPublisher
  implements CollegeDatasetPublisher
{
  constructor(private readonly pool: DatabasePool) {}

  publish(
    input: PublishCollegeDatasetInput,
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
        if (existingVersion.checksum !== input.manifest.checksumSha256) {
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
          input.manifest.recordCount,
          JSON.stringify({ schemaVersion: 1, issues: [] }),
        ],
      );

      for (const discipline of input.records.disciplines) {
        await client.query(
          `
            insert into knowledge.disciplines (
              id, discipline_code, title, domain_code, status
            ) values ($1, $2, $3, $4, $5)
            on conflict (id) do update set
              discipline_code = excluded.discipline_code,
              title = excluded.title,
              domain_code = excluded.domain_code,
              status = excluded.status
          `,
          [discipline.id, discipline.disciplineCode, discipline.title,
            discipline.domainCode, discipline.status],
        );
      }

      for (const college of input.records.colleges) {
        await client.query(
          `
            insert into knowledge.colleges (
              id, external_code, name, city, state, institution_type,
              tier, admission_route, fees_band, website_url,
              verification_status, last_verified_at,
              dataset_version_id, created_at, updated_at
            )
            values (
              $1, null, $2, $3, $4, $5, null, null, null, $6,
              $7, $8, $9, now(), now()
            )
            on conflict (id) do update set
              name = excluded.name,
              city = excluded.city,
              state = excluded.state,
              institution_type = excluded.institution_type,
              website_url = excluded.website_url,
              verification_status = excluded.verification_status,
              last_verified_at = excluded.last_verified_at,
              dataset_version_id = excluded.dataset_version_id,
              updated_at = now()
          `,
          [
            college.id,
            college.name,
            college.city,
            college.state,
            college.institutionType,
            college.websiteUrl,
            college.verificationStatus,
            college.lastVerifiedAt,
            college.datasetVersionId,
          ],
        );
      }

      for (const program of input.records.programs) {
        await client.query(
          `
            insert into knowledge.college_programs (
              id, college_id, discipline_id, program_name,
              qualification_level, duration_band, admission_route,
              fees_band, verification_status, last_verified_at,
              dataset_version_id
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [program.id, program.collegeId, program.disciplineId,
            program.programName, program.qualificationLevel,
            program.durationBand, program.admissionRoute, program.feesBand,
            program.verificationStatus, program.lastVerifiedAt,
            program.datasetVersionId],
        );
      }

      for (const mapping of input.records.pathwayDisciplines) {
        await client.query(
          `
            insert into knowledge.pathway_disciplines (
              pathway_id, discipline_id, relevance_weight, mapping_version
            ) values ($1, $2, $3, $4)
            on conflict (pathway_id, discipline_id) do update set
              relevance_weight = excluded.relevance_weight,
              mapping_version = excluded.mapping_version
          `,
          [mapping.pathwayId, mapping.disciplineId,
            mapping.relevanceWeight, mapping.mappingVersion],
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
