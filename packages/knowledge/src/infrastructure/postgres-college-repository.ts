import {
  CollegeSchema,
  type College,
} from "@yuvanext/contracts";
import type {
  CollegeFilters,
  CollegeRepository,
} from "../domain/college.js";

type CollegeDatabaseRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  institutionType: string;
  websiteUrl: string | null;
  verificationStatus: string;
  lastVerifiedAt: Date | string | null;
  datasetVersionId: string;
};

export interface CollegeQueryExecutor {
  query(
    sql: string,
    values: unknown[],
  ): Promise<{ rows: CollegeDatabaseRow[] }>;
}

export class PostgresCollegeRepository implements CollegeRepository {
  constructor(private readonly database: CollegeQueryExecutor) {}

  async list(filters: CollegeFilters): Promise<readonly College[]> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const result = await this.database.query(
      `
        with selected_dataset as (
          select dataset.id
          from knowledge.dataset_versions as dataset
          inner join knowledge.knowledge_sources as source
            on source.id = dataset.source_id
          where dataset.import_status = 'published'
            and exists (
              select 1
              from knowledge.colleges as candidate
              where candidate.dataset_version_id = dataset.id
                and candidate.verification_status = 'verified'
                and (
                  $1::text is null
                  or lower(trim(candidate.state)) = lower(trim($1::text))
                )
            )
          order by
            case source.trust_level
              when 'authoritative_external' then 0
              when 'project_reviewed' then 1
              else 2
            end,
            dataset.published_at desc nulls last,
            dataset.imported_at desc,
            dataset.id
          limit 1
        )
        select
          college.id::text as "id",
          college.name,
          college.city,
          college.state,
          college.institution_type as "institutionType",
          college.website_url as "websiteUrl",
          college.verification_status as "verificationStatus",
          college.last_verified_at as "lastVerifiedAt",
          college.dataset_version_id::text as "datasetVersionId"
        from knowledge.colleges as college
        inner join knowledge.dataset_versions as dataset
          on dataset.id = college.dataset_version_id
        inner join selected_dataset
          on selected_dataset.id = dataset.id
        where college.verification_status = 'verified'
          and dataset.import_status = 'published'
          and (
            $1::text is null
            or lower(trim(college.state)) = lower(trim($1::text))
          )
          and (
            ($2::uuid is null and $3::text is null)
            or exists (
              select 1
              from knowledge.college_programs as program
              inner join knowledge.disciplines as discipline
                on discipline.id = program.discipline_id
              left join knowledge.pathway_disciplines as mapping
                on mapping.discipline_id = discipline.id
              where program.college_id = college.id
                and program.verification_status = 'verified'
                and discipline.status = 'active'
                and (
                  $2::uuid is null
                  or mapping.pathway_id = $2::uuid
                )
                and (
                  $3::text is null
                  or lower(discipline.discipline_code) = lower($3::text)
                  or lower(discipline.title) = lower($3::text)
                )
            )
          )
        order by lower(college.name), lower(college.city), college.id
        limit $4
      `,
      [
        filters.state ?? null,
        filters.pathwayId ?? null,
        filters.discipline ?? null,
        limit,
      ],
    );

    return result.rows.map((row) =>
      CollegeSchema.parse({
        ...row,
        lastVerifiedAt:
          row.lastVerifiedAt instanceof Date
            ? row.lastVerifiedAt.toISOString()
            : row.lastVerifiedAt,
      }),
    );
  }
}
