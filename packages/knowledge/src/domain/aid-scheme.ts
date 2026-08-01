import type { AidScheme } from "@yuvanext/contracts";

export type AidSchemeFilters = {
  state?: string;
  level?: string;
  limit?: number;
};

export interface AidSchemeRepository {
  list(filters: AidSchemeFilters): Promise<readonly AidScheme[]>;
}
