import {
  createOpenApiRegistry,
  PublishedDatasetListResponseSchema,
  PublishedDatasetSchema,
} from "@yuvanext/contracts";
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

const dataset = PublishedDatasetSchema.parse({
  id: "d2222222-2222-4222-8222-222222222223",
  datasetKey: "aid-schemes-poc",
  version: "2026-08-02",
  checksumSha256: "9d546c0d6e4930dfa804d8daa8b7785f650e144e1fe1b97ba3cd8e706fe1e887",
  recordCount: 3,
  publishedAt: "2026-08-03T00:00:00.000Z",
  source: {
    sourceKey: "yuvanext-synthetic-aid-poc",
    name: "YuvaNext synthetic aid fixtures",
    publisher: "YuvaNext POC team",
    trustLevel: "project_reviewed",
  },
});

describe("dataset routes", () => {
  it("lists published dataset metadata and provenance", async () => {
    const app = express();
    registerKnowledgeRoutes(app, createOpenApiRegistry(), {
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([dataset]),
      streamRepository: new InMemoryStreamRepository([], [], []),
    });

    const response = await request(app)
      .get("/api/v1/catalog/datasets")
      .expect(200);
    const body = PublishedDatasetListResponseSchema.parse(response.body);
    expect(body.data).toEqual([dataset]);
  });
});
