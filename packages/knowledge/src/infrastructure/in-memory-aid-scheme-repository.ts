import type { AidCriterion, AidScheme } from "@yuvanext/contracts";
import { matchesAidCriteria, type AidSchemeFilters, type AidSchemeRepository } from "../domain/aid-scheme.js";

export class InMemoryAidSchemeRepository implements AidSchemeRepository {
  constructor(
    private readonly schemes: readonly AidScheme[],
    private readonly criteria: readonly AidCriterion[] = [],
  ) {}

  list(filters: AidSchemeFilters): Promise<readonly AidScheme[]> {
    const state = filters.state?.trim().toLowerCase();
    const level = filters.level?.trim().toLowerCase();
    return Promise.resolve(
      this.schemes
        .filter(({ verificationStatus }) => verificationStatus === "verified")
        .filter(({ states }) =>
          state === undefined || states.length === 0 ||
          states.some((value) => value.toLowerCase() === state),
        )
        .filter((scheme) => level === undefined || scheme.level.toLowerCase() === level)
        .filter((scheme) => matchesAidCriteria(
          this.criteria.filter(({ aidSchemeId }) => aidSchemeId === scheme.id),
          filters,
        ))
        .slice(0, filters.limit ?? 20),
    );
  }
}
