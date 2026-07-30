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
        where college.verification_status = 'verified'
          and dataset.import_status = 'published'
          and (
            $1::text is null
            or lower(trim(college.state)) = lower(trim($1::text))
          )
        order by lower(college.name), lower(college.city), college.id
        limit $2
      `,
      [filters.state ?? null, limit],
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
