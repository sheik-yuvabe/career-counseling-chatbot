import {
  CareerInterestProfileSchema,
  CareerProfileSchema,
  CareerSchema,
} from "@yuvanext/contracts";
import type {
  CareerCatalogEntry,
  CareerRepository,
} from "../domain/career.js";

type CareerDatabaseRow = {
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
  interestCareerId: string | null;
  realistic: string | number | null;
  investigative: string | number | null;
  artistic: string | number | null;
  social: string | number | null;
  enterprising: string | number | null;
  conventional: string | number | null;
  highPointCode: string | null;
  profileVersion: string | null;
  interestDatasetVersionId: string | null;
  profileCareerId: string | null;
  imageRef: string | null;
  salaryEntryBand: string | null;
  salaryNote: string | null;
  skills: string[] | null;
  nextRole3yr: string | null;
  progressionNote: string | null;
  reviewStatus: string | null;
  lastReviewedAt: Date | string | null;
  reviewedBy: string | null;
};

export interface CareerQueryExecutor {
  query(
    sql: string,
    values: unknown[],
  ): Promise<{ rows: CareerDatabaseRow[] }>;
}

export class PostgresCareerRepository implements CareerRepository {
  constructor(private readonly database: CareerQueryExecutor) {}

  async findBySlug(slug: string): Promise<CareerCatalogEntry | null> {
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
          career.retired_at as "retiredAt",
          interest.career_id::text as "interestCareerId",
          interest.realistic,
          interest.investigative,
          interest.artistic,
          interest.social,
          interest.enterprising,
          interest.conventional,
          interest.high_point_code as "highPointCode",
          interest.profile_version as "profileVersion",
          interest.dataset_version_id::text
            as "interestDatasetVersionId",
          profile.career_id::text as "profileCareerId",
          profile.image_ref as "imageRef",
          profile.salary_entry_band as "salaryEntryBand",
          profile.salary_note as "salaryNote",
          profile.skills,
          profile.next_role_3yr as "nextRole3yr",
          profile.progression_note as "progressionNote",
          profile.review_status as "reviewStatus",
          profile.last_reviewed_at as "lastReviewedAt",
          profile.reviewed_by::text as "reviewedBy"
        from knowledge.careers as career
        inner join knowledge.dataset_versions as dataset
          on dataset.id = career.dataset_version_id
        left join knowledge.career_interest_profiles as interest
          on interest.career_id = career.id
        left join knowledge.career_profiles as profile
          on profile.career_id = career.id
          and profile.review_status = 'reviewed'
        where lower(career.slug) = lower($1)
          and career.publication_status = 'published'
          and dataset.import_status = 'published'
        limit 1
      `,
      [slug],
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    const career = CareerSchema.parse({
      id: row.id,
      onetCode: row.onetCode,
      ncoCode: row.ncoCode,
      slug: row.slug,
      title: row.title,
      shortDescription: row.shortDescription,
      domainCode: row.domainCode,
      primaryEducationRouteId: row.primaryEducationRouteId,
      isCurated: row.isCurated,
      publicationStatus: row.publicationStatus,
      datasetVersionId: row.datasetVersionId,
      publishedAt: toIsoTimestamp(row.publishedAt),
      retiredAt: toIsoTimestamp(row.retiredAt),
    });
    const interestProfile =
      row.interestCareerId === null
        ? null
        : CareerInterestProfileSchema.parse({
            careerId: row.interestCareerId,
            realistic: Number(row.realistic),
            investigative: Number(row.investigative),
            artistic: Number(row.artistic),
            social: Number(row.social),
            enterprising: Number(row.enterprising),
            conventional: Number(row.conventional),
            highPointCode: row.highPointCode,
            profileVersion: row.profileVersion,
            datasetVersionId: row.interestDatasetVersionId,
          });
    const profile =
      row.profileCareerId === null
        ? null
        : CareerProfileSchema.parse({
            careerId: row.profileCareerId,
            imageRef: row.imageRef,
            salaryEntryBand: row.salaryEntryBand,
            salaryNote: row.salaryNote,
            skills: row.skills ?? [],
            nextRole3yr: row.nextRole3yr,
            progressionNote: row.progressionNote,
            reviewStatus: row.reviewStatus,
            lastReviewedAt: toIsoTimestamp(row.lastReviewedAt),
            reviewedBy: row.reviewedBy,
          });

    return { career, interestProfile, profile };
  }
}

const toIsoTimestamp = (
  value: Date | string | null,
): string | null =>
  value instanceof Date ? value.toISOString() : value;
