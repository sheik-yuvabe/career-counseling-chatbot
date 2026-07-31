import type {
  College,
  CollegeProgram,
  Discipline,
  PathwayDiscipline,
} from "@yuvanext/contracts";
import type {
  CollegeFilters,
  CollegeRepository,
} from "../domain/college.js";

export class InMemoryCollegeRepository implements CollegeRepository {
  constructor(
    private readonly colleges: readonly College[],
    private readonly programs: readonly CollegeProgram[] = [],
    private readonly disciplines: readonly Discipline[] = [],
    private readonly pathwayDisciplines: readonly PathwayDiscipline[] = [],
  ) {}

  list(filters: CollegeFilters): Promise<readonly College[]> {
    const requestedState = filters.state?.trim().toLowerCase();
    const limit = filters.limit ?? this.colleges.length;

    return Promise.resolve(
      this.colleges
        .filter(
          (college) =>
            requestedState === undefined ||
            college.state.trim().toLowerCase() === requestedState,
        )
        .filter((college) =>
          this.matchesProgramFilters(college.id, filters),
        )
        .slice(0, limit),
    );
  }

  private matchesProgramFilters(
    collegeId: string,
    filters: CollegeFilters,
  ): boolean {
    if (
      filters.pathwayId === undefined &&
      filters.discipline === undefined
    ) {
      return true;
    }

    return this.programs
      .filter(
        (program) =>
          program.collegeId === collegeId &&
          program.verificationStatus === "verified",
      )
      .some((program) => {
        const discipline = this.disciplines.find(
          (candidate) =>
            candidate.id === program.disciplineId &&
            candidate.status === "active",
        );
        if (discipline === undefined) return false;

        const matchesDiscipline =
          filters.discipline === undefined ||
          discipline.disciplineCode.toLowerCase() ===
            filters.discipline.trim().toLowerCase() ||
          discipline.title.toLowerCase() ===
            filters.discipline.trim().toLowerCase();
        const matchesPathway =
          filters.pathwayId === undefined ||
          this.pathwayDisciplines.some(
            (mapping) =>
              mapping.pathwayId === filters.pathwayId &&
              mapping.disciplineId === discipline.id,
          );
        return matchesDiscipline && matchesPathway;
      });
  }
}
