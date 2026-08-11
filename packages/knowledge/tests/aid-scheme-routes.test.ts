import {
  AidSchemeListResponseSchema,
  AidSchemeSchema,
  createOpenApiRegistry,
} from "@yuvanext/contracts";
import { aidSchemeFixtures } from "../../test-fixtures/src/index.js";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  InMemoryAidSchemeRepository,
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryDatasetRepository,
  InMemoryStreamRepository,
  registerKnowledgeRoutes,
} from "../src/index.js";

const createTestApp = () => {
  const app = express();
  registerKnowledgeRoutes(app, createOpenApiRegistry(), {
    aidSchemeRepository: new InMemoryAidSchemeRepository(
      AidSchemeSchema.array().parse(aidSchemeFixtures),
    ),
    careerRepository: new InMemoryCareerRepository([]),
    careerSearchRepository: new InMemoryCareerSearchRepository([]),
    collegeRepository: new InMemoryCollegeRepository([]),
    datasetRepository: new InMemoryDatasetRepository([]),
    streamRepository: new InMemoryStreamRepository([], [], []),
  });
  return app;
};

describe("aid scheme routes", () => {
  it("lists verified schemes matching state and level", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/catalog/aid-schemes")
      .query({ state: "Tamil Nadu", level: "ug" })
      .expect(200);
    const body = AidSchemeListResponseSchema.parse(response.body);
    expect(body.data.map(({ aidCode }) => aidCode)).toEqual(["TN-UG-DEMO"]);
  });

  it("rejects an invalid limit", async () => {
    await request(createTestApp())
      .get("/api/v1/catalog/aid-schemes")
      .query({ limit: 100 })
      .expect(400);
  });
});
