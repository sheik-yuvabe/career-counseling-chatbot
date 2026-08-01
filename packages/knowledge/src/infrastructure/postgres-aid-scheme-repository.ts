import { AidSchemeSchema, type AidScheme } from "@yuvanext/contracts";
import type { AidSchemeFilters, AidSchemeRepository } from "../domain/aid-scheme.js";

type QueryExecutor = {
  query(sql: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
};

export class PostgresAidSchemeRepository implements AidSchemeRepository {
  constructor(private readonly database: QueryExecutor) {}

  async list(filters: AidSchemeFilters): Promise<readonly AidScheme[]> {
    const result = await this.database.query(
      `select aid.id::text as "id", aid.aid_code as "aidCode", aid.name,
        aid.provider_type as "providerType", aid.provider, aid.level,
        coalesce(aid.states, array[]::text[]) as states,
        aid.eligibility_summary as "eligibilitySummary",
        aid.benefit_summary as "benefitSummary", aid.amount_text as "amountText",
        aid.application_url as "applicationUrl", aid.portal_name as "portalName",
        aid.apply_window_start::text as "applyWindowStart",
        aid.apply_window_end::text as "applyWindowEnd",
        aid.verification_status as "verificationStatus",
        aid.last_verified_at as "lastVerifiedAt",
        aid.dataset_version_id::text as "datasetVersionId"
      from knowledge.aid_schemes aid
      join knowledge.dataset_versions dataset on dataset.id = aid.dataset_version_id
      where aid.verification_status = 'verified'
        and dataset.import_status = 'published'
        and ($1::text is null or cardinality(aid.states) = 0 or exists (
          select 1 from unnest(aid.states) state where lower(state) = lower($1::text)
        ))
        and ($2::text is null or lower(aid.level) = lower($2::text))
      order by lower(aid.name), aid.id
      limit $3`,
      [filters.state ?? null, filters.level ?? null, filters.limit ?? 20],
    );
    return result.rows.map((row) => AidSchemeSchema.parse({
      ...row,
      lastVerifiedAt: row.lastVerifiedAt instanceof Date
        ? row.lastVerifiedAt.toISOString()
        : row.lastVerifiedAt,
    }));
  }
}
