import type { College } from "@yuvanext/contracts";
import type {
  CollegeFilters,
  CollegeRepository,
} from "../domain/college.js";

export class InMemoryCollegeRepository implements CollegeRepository {
  constructor(private readonly colleges: readonly College[]) {}

  list(filters: CollegeFilters): Promise<readonly College[]> {
    const requestedState = filters.state?.trim().toLowerCase();
    const limit = filters.limit ?? this.colleges.length;

    if (requestedState === undefined) {
      return Promise.resolve(this.colleges.slice(0, limit));
    }

    return Promise.resolve(
      this.colleges.filter(
        (college) =>
          college.state.trim().toLowerCase() === requestedState,
      ).slice(0, limit),
    );
  }
}
