import {
  createOpenApiRegistry,
  StreamListResponseSchema,
  StreamMapItemSchema,
  StreamMapSchema,
  StreamOptionSchema,
} from "@yuvanext/contracts";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  streamMapFixtures,
  streamMapItemFixtures,
  streamOptionFixtures,
} from "../../test-fixtures/src/index.js";
import {
  InMemoryAidSchemeRepository,
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryDatasetRepository,
  InMemoryStreamRepository,
  type StreamQueryExecutor,
  PostgresStreamRepository,
  registerKnowledgeRoutes,
} from "../src/index.js";

const maps = StreamMapSchema.array().parse(streamMapFixtures);
const items = StreamMapItemSchema.array().parse(
  streamMapItemFixtures,
);
const options = StreamOptionSchema.array().parse(
  streamOptionFixtures,
);

const createTestApp = () => {
  const app = express();

  registerKnowledgeRoutes(app, createOpenApiRegistry(), {
    aidSchemeRepository: new InMemoryAidSchemeRepository([]),
    datasetRepository: new InMemoryDatasetRepository([]),
    careerRepository: new InMemoryCareerRepository([]),
    careerSearchRepository: new InMemoryCareerSearchRepository([]),
    collegeRepository: new InMemoryCollegeRepository([]),
    streamRepository: new InMemoryStreamRepository(
      maps,
      items,
      options,
    ),
  });
  return app;
};

describe("stream retrieval", () => {
  it("returns ranked options for a RIASEC code and segment", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/catalog/streams")
      .query({ topTwo: "RI", segment: "explorer" })
      .expect(200);
    const body = StreamListResponseSchema.parse(response.body);

    expect(body.data.map((item) => item.rank)).toEqual([1, 2]);
    expect(body.data[0]?.streamCode).toBe("science-mathematics");
  });

  it("rejects repeated RIASEC letters", async () => {
    await request(createTestApp())
      .get("/api/v1/catalog/streams")
      .query({ topTwo: "RR", segment: "explorer" })
      .expect(400);
  });

  it("filters published maps and active options in SQL", async () => {
    const query =
      vi.fn<StreamQueryExecutor["query"]>().mockResolvedValue({
        rows: [],
      });
    const repository = new PostgresStreamRepository({ query });

    await repository.findPublished({
      topTwo: "RI",
      segment: "explorer",
    });
    const sql = query.mock.calls[0]?.[0] ?? "";

    expect(sql).toContain("map.segment = $2");
    expect(sql).toContain("map.status = 'published'");
    expect(sql).toContain("dataset.import_status = 'published'");
    expect(sql).toContain("option.status = 'active'");
  });
});
