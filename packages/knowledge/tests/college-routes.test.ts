import {
  CollegeListResponseSchema,
  CollegeSchema,
  createOpenApiRegistry,
} from "@yuvanext/contracts";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { collegeFixtures } from "../../test-fixtures/src/index.js";
import {
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryStreamRepository,
  registerKnowledgeRoutes,
} from "../src/index.js";

const createTestApp = () => {
  const app = express();
  const colleges = CollegeSchema.array().parse(collegeFixtures);

  registerKnowledgeRoutes(app, createOpenApiRegistry(), {
    careerRepository: new InMemoryCareerRepository([]),
    careerSearchRepository: new InMemoryCareerSearchRepository([]),
    collegeRepository: new InMemoryCollegeRepository(colleges),
    streamRepository: new InMemoryStreamRepository([], [], []),
  });

  return app;
};

describe("college routes", () => {
  it("returns a bounded list of verified colleges", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/catalog/colleges")
      .query({ state: "Tamil Nadu", limit: 1 })
      .expect(200);

    const body = CollegeListResponseSchema.parse(response.body);

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe("Chennai Technical College");
    expect(body.data[0]?.verificationStatus).toBe("verified");
  });

  it("rejects a request without the required state", async () => {
    const response = await request(createTestApp()).get("/api/v1/catalog/colleges").expect(400);

    expect(response.body).toEqual({
      code: "INVALID_CATALOG_QUERY",
      message: "College query parameters are invalid",
    });
  });
});
