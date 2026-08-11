import { describe, expect, it, vi } from "vitest";
import { type CareerSearchQueryExecutor, PostgresCareerSearchRepository } from "../src/index.js";

describe("PostgresCareerSearchRepository", () => {
  it("queries published careers with bounded filters", async () => {
    const query = vi.fn<CareerSearchQueryExecutor["query"]>().mockResolvedValue({
      rows: [],
    });
    const repository = new PostgresCareerSearchRepository({ query });

    await repository.search({
      query: "data",
      domain: "technology",
      afterSlug: "accountant",
      limit: 100,
    });
    const sql = query.mock.calls[0]?.[0] ?? "";

    expect(sql).toContain("career.publication_status = 'published'");
    expect(sql).toContain("dataset.import_status = 'published'");
    expect(sql).toContain("order by lower(career.slug)");
    expect(query.mock.calls[0]?.[1]).toEqual(["data", "technology", "accountant", 51]);
  });
});
