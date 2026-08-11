import type { Career } from "@yuvanext/contracts";
import type { CareerSearchFilters, CareerSearchRepository } from "../domain/career-search.js";

export class InMemoryCareerSearchRepository implements CareerSearchRepository {
  constructor(private readonly careers: readonly Career[]) {}

  search(filters: CareerSearchFilters): Promise<readonly Career[]> {
    const query = filters.query?.trim().toLowerCase();
    const domain = filters.domain?.trim().toLowerCase();
    const afterSlug = filters.afterSlug?.toLowerCase();

    return Promise.resolve(
      this.careers
        .filter((career) => career.publicationStatus === "published")
        .filter((career) => query === undefined || career.title.toLowerCase().includes(query))
        .filter((career) => domain === undefined || career.domainCode.toLowerCase() === domain)
        .filter((career) => afterSlug === undefined || career.slug.toLowerCase() > afterSlug)
        .slice()
        .sort(
          (first, second) =>
            first.slug.localeCompare(second.slug) || first.id.localeCompare(second.id),
        )
        .slice(0, filters.limit),
    );
  }
}
