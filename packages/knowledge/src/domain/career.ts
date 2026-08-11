import type {
  Career,
  CareerInterestProfile,
  CareerProfile,
} from "@yuvanext/contracts";

export type CareerCatalogEntry = {
  career: Career;
  interestProfile: CareerInterestProfile | null;
  profile: CareerProfile | null;
};

export interface CareerRepository {
  findBySlug(slug: string): Promise<CareerCatalogEntry | null>;
}

export class CatalogEntityNotFoundError extends Error {
  readonly code = "CATALOG_ENTITY_NOT_FOUND" as const;

  constructor(entityType: string, identifier: string) {
    super(`${entityType} '${identifier}' is not in the published catalog`);
    this.name = "CatalogEntityNotFoundError";
  }
}
