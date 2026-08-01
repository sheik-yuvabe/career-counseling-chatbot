import type { AidScheme } from "@yuvanext/contracts";
import type { AidSchemeFilters, AidSchemeRepository } from "../domain/aid-scheme.js";

export class InMemoryAidSchemeRepository implements AidSchemeRepository {
  constructor(private readonly schemes: readonly AidScheme[]) {}

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
        .slice(0, filters.limit ?? 20),
    );
  }
}
