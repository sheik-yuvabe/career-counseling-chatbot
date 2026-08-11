import type { College } from "@yuvanext/contracts";
import {
  type CollegeFilters,
  type CollegeRepository,
  isStudentVisibleCollege,
} from "../domain/college.js";

export async function listColleges(
  repository: CollegeRepository,
  filters: CollegeFilters,
): Promise<College[]> {
  const colleges = await repository.list(filters);
  const requestedState = filters.state?.trim().toLowerCase();

  return colleges
    .filter(isStudentVisibleCollege)
    .filter(
      (college) =>
        requestedState === undefined || college.state.trim().toLowerCase() === requestedState,
    )
    .slice()
    .sort(
      (first, second) =>
        first.name.localeCompare(second.name) ||
        first.city.localeCompare(second.city) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, filters.limit);
}
