import {
  CollegeListQuerySchema,
  CollegeListResponseSchema,
  CollegeSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import { collegeFixtures } from "../../test-fixtures/src/index.js";
import {
  getColleges,
  InMemoryCollegeRepository,
} from "../src/index.js";

const colleges = CollegeSchema.array().parse(collegeFixtures);
const repository = new InMemoryCollegeRepository(colleges);

describe("getColleges", () => {
  it("returns a bounded, versioned tool response", async () => {
    const query = CollegeListQuerySchema.parse({
      state: "Tamil Nadu",
      limit: "1",
    });

    const response = await getColleges(repository, query, {
      now: () => new Date("2026-07-29T10:00:00.000Z"),
    });

    expect(CollegeListResponseSchema.parse(response)).toEqual(response);
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.verificationStatus).toBe("verified");
    expect(response.sourceDataVersions).toEqual({
      colleges: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(response.retrievedAt).toBe("2026-07-29T10:00:00.000Z");
    expect(response.caveats).toEqual([]);
  });
});
