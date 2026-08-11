import { AidSchemeSchema, type AidScheme } from "@yuvanext/contracts";
import type { AidSchemeFilters, AidSchemeRepository } from "../domain/aid-scheme.js";

type QueryExecutor = {
  query(sql: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
};

export class PostgresAidSchemeRepository implements AidSchemeRepository {
  constructor(private readonly database: QueryExecutor) {}

  async list(filters: AidSchemeFilters): Promise<readonly AidScheme[]> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const result = await this.database.query(
      `with selected_dataset as (
        select dataset.id
        from knowledge.dataset_versions dataset
        join knowledge.knowledge_sources source on source.id = dataset.source_id
        where dataset.import_status = 'published'
          and exists (
            select 1
            from knowledge.aid_schemes candidate
            where candidate.dataset_version_id = dataset.id
              and candidate.verification_status = 'verified'
              and ($1::text is null or cardinality(candidate.states) = 0 or exists (
                select 1
                from unnest(candidate.states) state
                where lower(trim(state)) = lower(trim($1::text))
              ))
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
      select aid.id::text as "id", aid.aid_code as "aidCode", aid.name,
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
      join selected_dataset on selected_dataset.id = dataset.id
      where aid.verification_status = 'verified'
        and dataset.import_status = 'published'
        and ($1::text is null or cardinality(aid.states) = 0 or exists (
          select 1 from unnest(aid.states) state where lower(state) = lower($1::text)
        ))
        and ($2::text is null or lower(aid.level) = lower($2::text))
        and ($3::numeric is null or not exists (
          select 1 from knowledge.aid_criteria criterion
          where criterion.aid_scheme_id = aid.id
            and criterion.is_required
            and criterion.criterion_type = 'annual_income_max'
            and $3::numeric > (criterion.value_json->>'amount')::numeric
        ))
        and ($4::text is null or not exists (
          select 1 from knowledge.aid_criteria criterion
          where criterion.aid_scheme_id = aid.id
            and criterion.is_required
            and criterion.criterion_type = 'student_category'
            and not (criterion.value_json->'values' ? $4::text)
        ))
      order by lower(aid.name), aid.id
      limit $5`,
      [
        filters.state ?? null,
        filters.level ?? null,
        filters.annualIncome ?? null,
        filters.category ?? null,
        limit,
      ],
    );
    return result.rows.map((row) =>
      AidSchemeSchema.parse({
        ...row,
        lastVerifiedAt:
          row.lastVerifiedAt instanceof Date
            ? row.lastVerifiedAt.toISOString()
            : row.lastVerifiedAt,
      }),
    );
  }
}
