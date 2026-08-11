import type { AidCriterion, AidScheme } from "@yuvanext/contracts";

export type AidSchemeFilters = {
  state?: string;
  level?: string;
  annualIncome?: number;
  category?: string;
  limit?: number;
};

export interface AidSchemeRepository {
  list(filters: AidSchemeFilters): Promise<readonly AidScheme[]>;
}

export const matchesAidCriteria = (
  criteria: readonly AidCriterion[],
  filters: AidSchemeFilters,
): boolean => criteria.every((criterion) => {
  if (criterion.criterionType === "annual_income_max") {
    if (filters.annualIncome === undefined) return true;
    return "amount" in criterion.value &&
      filters.annualIncome <= criterion.value.amount;
  }
  if (filters.category === undefined) return true;
  return "values" in criterion.value &&
    criterion.value.values.includes(
      filters.category as (typeof criterion.value.values)[number],
    );
});
