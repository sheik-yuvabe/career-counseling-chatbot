import { CareerSchema, type Career } from "@yuvanext/contracts";
import type { CareerSearchFilters, CareerSearchRepository } from "../domain/career-search.js";

type CareerSearchDatabaseRow = {
  id: string;
  onetCode: string | null;
  ncoCode: string | null;
  slug: string;
  title: string;
  shortDescription: string | null;
  domainCode: string;
  primaryEducationRouteId: string | null;
  isCurated: boolean;
  publicationStatus: string;
  datasetVersionId: string;
  publishedAt: Date | string | null;
  retiredAt: Date | string | null;
};

export interface CareerSearchQueryExecutor {
  query(sql: string, values: unknown[]): Promise<{ rows: CareerSearchDatabaseRow[] }>;
}

export class PostgresCareerSearchRepository implements CareerSearchRepository {
  constructor(private readonly database: CareerSearchQueryExecutor) {}

  async search(filters: CareerSearchFilters): Promise<readonly Career[]> {
    const limit = Math.min(Math.max(filters.limit, 1), 51);
    const result = await this.database.query(
      `
        select
          career.id::text as "id",
          career.onet_code as "onetCode",
          career.nco_code as "ncoCode",
          career.slug,
          career.title,
          career.short_description as "shortDescription",
          career.domain_code as "domainCode",
          career.primary_education_route_id::text
            as "primaryEducationRouteId",
          career.is_curated as "isCurated",
          career.publication_status as "publicationStatus",
          career.dataset_version_id::text as "datasetVersionId",
          career.published_at as "publishedAt",
          career.retired_at as "retiredAt"
        from knowledge.careers as career
        inner join knowledge.dataset_versions as dataset
          on dataset.id = career.dataset_version_id
        where career.publication_status = 'published'
          and dataset.import_status = 'published'
          and (
            $1::text is null
            or position(lower($1::text) in lower(career.title)) > 0
          )
          and (
            $2::text is null
            or lower(career.domain_code) = lower($2::text)
          )
          and (
            $3::text is null
            or lower(career.slug) > lower($3::text)
          )
        order by lower(career.slug), career.id
        limit $4
      `,
      [filters.query ?? null, filters.domain ?? null, filters.afterSlug ?? null, limit],
    );

    return result.rows.map((row) =>
      CareerSchema.parse({
        ...row,
        publishedAt: toIsoTimestamp(row.publishedAt),
        retiredAt: toIsoTimestamp(row.retiredAt),
      }),
    );
  }
}

const toIsoTimestamp = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;
