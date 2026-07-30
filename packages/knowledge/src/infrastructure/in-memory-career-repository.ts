import type { CareerCatalogEntry, CareerRepository } from "../domain/career.js";

export class InMemoryCareerRepository implements CareerRepository {
  constructor(private readonly entries: readonly CareerCatalogEntry[]) {}

  findBySlug(slug: string): Promise<CareerCatalogEntry | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    const entry = this.entries.find(
      (candidate) =>
        candidate.career.slug.toLowerCase() === normalizedSlug,
    );

    return Promise.resolve(entry ?? null);
  }
}
