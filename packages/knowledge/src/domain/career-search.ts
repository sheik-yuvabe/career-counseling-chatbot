import type { Career } from "@yuvanext/contracts";

export type CareerSearchFilters = {
  query?: string;
  domain?: string;
  afterSlug?: string;
  limit: number;
};

export interface CareerSearchRepository {
  search(filters: CareerSearchFilters): Promise<readonly Career[]>;
}

export class InvalidCatalogCursorError extends Error {
  readonly code = "INVALID_CATALOG_CURSOR" as const;

  constructor() {
    super("Career search cursor is invalid");
    this.name = "InvalidCatalogCursorError";
  }
}
