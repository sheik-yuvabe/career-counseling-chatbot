import { CollegeSchema } from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import { collegeFixtures } from "../../test-fixtures/src/index.js";
import {
  type CollegeRepository,
  listColleges,
} from "../src/index.js";

const colleges = CollegeSchema.array().parse(collegeFixtures);

const repository: CollegeRepository = {
  list() {
    return Promise.resolve(colleges);
  },
};

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
});
