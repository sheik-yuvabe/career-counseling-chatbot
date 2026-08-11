import {
  CollegeProgramSchema,
  CollegeSchema,
  DisciplineSchema,
  PathwayDisciplineSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import {
  collegeFixtures,
  collegeProgramFixtures,
  disciplineFixtures,
  pathwayDisciplineFixtures,
} from "../../test-fixtures/src/index.js";
import {
  InMemoryCollegeRepository,
  listColleges,
} from "../src/index.js";

const colleges = CollegeSchema.array().parse(collegeFixtures);
const repository = new InMemoryCollegeRepository(colleges);

describe("listColleges", () => {
  it("returns only verified colleges", async () => {
    const result = await listColleges(repository, {});

    expect(result.map((college) => college.name)).toEqual([
      "Chennai Technical College",
    ]);
    expect(
      result.every(
        (college) => college.verificationStatus === "verified",
      ),
    ).toBe(true);
  });

  it("filters colleges by state without case sensitivity", async () => {
    const tamilNaduResult = await listColleges(repository, {
      state: "  tamil nadu  ",
    });
    const karnatakaResult = await listColleges(repository, {
      state: "Karnataka",
    });

    expect(tamilNaduResult).toHaveLength(1);
    expect(tamilNaduResult[0]?.name).toBe("Chennai Technical College");
    expect(karnatakaResult).toEqual([]);
  });

  it("filters colleges through verified programs and pathway disciplines", async () => {
    const programRepository = new InMemoryCollegeRepository(
      colleges,
      CollegeProgramSchema.array().parse(collegeProgramFixtures),
      DisciplineSchema.array().parse(disciplineFixtures),
      PathwayDisciplineSchema.array().parse(
        pathwayDisciplineFixtures,
      ),
    );

    const matching = await listColleges(programRepository, {
      pathwayId: "b4444444-4444-4444-8444-444444444444",
      discipline: "computing",
    });
    const missing = await listColleges(programRepository, {
      discipline: "electrical",
    });

    expect(matching.map((college) => college.name)).toEqual([
      "Chennai Technical College",
    ]);
    expect(missing).toEqual([]);
  });
});
