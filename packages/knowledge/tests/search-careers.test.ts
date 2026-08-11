import {
  CareerSchema,
  CareerSearchQuerySchema,
  CareerSearchResponseSchema,
} from "@yuvanext/contracts";
import { careerFixtures } from "../../test-fixtures/src/index.js";
import { describe, expect, it } from "vitest";
import {
  InMemoryCareerSearchRepository,
  InvalidCatalogCursorError,
  searchCareers,
} from "../src/index.js";

const careers = CareerSchema.array().parse([
  ...careerFixtures,
  {
    ...careerFixtures[0],
    id: "96666666-6666-4666-8666-666666666666",
    onetCode: null,
    slug: "graphic-designer",
    title: "Graphic Designer",
    domainCode: "design",
    isCurated: false,
  },
]);
const repository = new InMemoryCareerSearchRepository(careers);

describe("searchCareers", () => {
  it("filters published careers by title and domain", async () => {
    const query = CareerSearchQuerySchema.parse({
      q: "graphic",
      domain: "DESIGN",
    });

    const result = await searchCareers(repository, query, {
      now: () => new Date("2026-07-30T12:00:00.000Z"),
    });

    expect(CareerSearchResponseSchema.parse(result)).toEqual(result);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.title).toBe("Graphic Designer");
    expect(result.data[0]?.detailAvailability).toBe("restricted");
    expect(result.caveats).toHaveLength(1);
  });

  it("uses an opaque cursor for deterministic pagination", async () => {
    const firstPage = await searchCareers(repository, CareerSearchQuerySchema.parse({ limit: 1 }));
    const secondPage = await searchCareers(
      repository,
      CareerSearchQuerySchema.parse({
        limit: 1,
        cursor: firstPage.nextCursor,
      }),
    );

    expect(firstPage.data[0]?.slug).toBe("data-scientist");
    expect(firstPage.nextCursor).not.toBeNull();
    expect(secondPage.data[0]?.slug).toBe("graphic-designer");
    expect(secondPage.nextCursor).toBeNull();
  });

  it("rejects a malformed cursor", async () => {
    await expect(
      searchCareers(repository, CareerSearchQuerySchema.parse({ cursor: "not-a-cursor" })),
    ).rejects.toBeInstanceOf(InvalidCatalogCursorError);
  });
});
