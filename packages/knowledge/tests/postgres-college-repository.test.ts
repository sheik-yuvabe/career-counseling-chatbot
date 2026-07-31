import { describe, expect, it, vi } from "vitest";
import {
  type CollegeQueryExecutor,
  PostgresCollegeRepository,
} from "../src/index.js";

describe("PostgresCollegeRepository", () => {
  it("queries only verified colleges in published datasets", async () => {
    const query = vi.fn<CollegeQueryExecutor["query"]>().mockResolvedValue({
      rows: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Chennai Technical College",
          city: "Chennai",
          state: "Tamil Nadu",
          institutionType: "college",
          websiteUrl: "https://example.edu/chennai-technical",
          verificationStatus: "verified",
          lastVerifiedAt: new Date("2026-07-01T00:00:00.000Z"),
          datasetVersionId:
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      ],
    });
    const repository = new PostgresCollegeRepository({ query });

    const result = await repository.list({
      state: "Tamil Nadu",
      limit: 10,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "college.verification_status = 'verified'",
      ),
      ["Tamil Nadu", null, null, 10],
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "dataset.import_status = 'published'",
    );
    expect(result[0]?.lastVerifiedAt).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });

  it("caps database results at fifty records", async () => {
    const query = vi.fn<CollegeQueryExecutor["query"]>().mockResolvedValue({
      rows: [],
    });
    const repository = new PostgresCollegeRepository({ query });

    await repository.list({ limit: 500 });

    expect(query.mock.calls[0]?.[1]).toEqual([
      null,
      null,
      null,
      50,
    ]);
  });
});
