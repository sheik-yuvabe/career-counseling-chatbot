import { describe, expect, it, vi } from "vitest";
import {
  type CareerQueryExecutor,
  PostgresCareerRepository,
} from "../src/index.js";

const reviewedCareerRow = {
  id: "91111111-1111-4111-8111-111111111111",
  onetCode: "15-2051.00",
  ncoCode: null,
  slug: "data-scientist",
  title: "Data Scientist",
  shortDescription: "Uses reviewed data to investigate questions.",
  domainCode: "technology",
  primaryEducationRouteId:
    "92222222-2222-4222-8222-222222222222",
  isCurated: true,
  publicationStatus: "published",
  datasetVersionId: "93333333-3333-4333-8333-333333333333",
  publishedAt: new Date("2026-07-30T00:00:00.000Z"),
  retiredAt: null,
  interestCareerId: "91111111-1111-4111-8111-111111111111",
  realistic: "0.35000",
  investigative: "0.95000",
  artistic: "0.30000",
  social: "0.40000",
  enterprising: "0.45000",
  conventional: "0.70000",
  highPointCode: "I",
  profileVersion: "poc-1",
  interestDatasetVersionId:
    "93333333-3333-4333-8333-333333333333",
  profileCareerId: "91111111-1111-4111-8111-111111111111",
  imageRef: "catalog/careers/data-scientist.webp",
  salaryEntryBand: "Varies by location and qualification",
  salaryNote: "General guidance, not a guaranteed salary.",
  skills: ["Data analysis", "Statistics"],
  nextRole3yr: "Data Scientist",
  progressionNote: "Progress depends on experience.",
  reviewStatus: "reviewed",
  lastReviewedAt: new Date("2026-07-30T00:00:00.000Z"),
  reviewedBy: null,
};

describe("PostgresCareerRepository", () => {
  it("maps a published career and reviewed profile", async () => {
    const query =
      vi.fn<CareerQueryExecutor["query"]>().mockResolvedValue({
        rows: [reviewedCareerRow],
      });
    const repository = new PostgresCareerRepository({ query });

    const result = await repository.findBySlug("data-scientist");

    expect(result?.career.title).toBe("Data Scientist");
    expect(result?.interestProfile?.investigative).toBe(0.95);
    expect(result?.profile?.reviewStatus).toBe("reviewed");
    expect(result?.career.publishedAt).toBe(
      "2026-07-30T00:00:00.000Z",
    );
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "data-scientist",
    ]);
  });

  it("enforces publication and review safeguards in SQL", async () => {
    const query =
      vi.fn<CareerQueryExecutor["query"]>().mockResolvedValue({
        rows: [],
      });
    const repository = new PostgresCareerRepository({ query });

    const result = await repository.findBySlug("draft-career");
    const sql = query.mock.calls[0]?.[0] ?? "";

    expect(result).toBeNull();
    expect(sql).toContain(
      "career.publication_status = 'published'",
    );
    expect(sql).toContain("dataset.import_status = 'published'");
    expect(sql).toContain("profile.review_status = 'reviewed'");
  });

  it("returns no rich profile when the reviewed join is empty", async () => {
    const query =
      vi.fn<CareerQueryExecutor["query"]>().mockResolvedValue({
        rows: [
          {
            ...reviewedCareerRow,
            profileCareerId: null,
            imageRef: null,
            salaryEntryBand: null,
            salaryNote: null,
            skills: null,
            nextRole3yr: null,
            progressionNote: null,
            reviewStatus: null,
            lastReviewedAt: null,
            reviewedBy: null,
          },
        ],
      });
    const repository = new PostgresCareerRepository({ query });

    const result = await repository.findBySlug("data-scientist");

    expect(result?.profile).toBeNull();
  });
});
