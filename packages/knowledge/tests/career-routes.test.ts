import {
  ApiErrorSchema,
  CareerInterestProfileSchema,
  CareerProfileSchema,
  CareerSchema,
  CareerToolResultSchema,
  createOpenApiRegistry,
} from "@yuvanext/contracts";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  careerFixtures,
  careerInterestProfileFixtures,
  careerProfileFixtures,
} from "../../test-fixtures/src/index.js";
import {
  InMemoryCareerRepository,
  InMemoryCollegeRepository,
  registerKnowledgeRoutes,
} from "../src/index.js";

const careers = CareerSchema.array().parse(careerFixtures);
const interestProfiles = CareerInterestProfileSchema.array().parse(careerInterestProfileFixtures);
const profiles = CareerProfileSchema.array().parse(careerProfileFixtures);

const createTestApp = () => {
  const app = express();

  registerKnowledgeRoutes(app, createOpenApiRegistry(), {
    careerRepository: new InMemoryCareerRepository([
      {
        career: careers[0]!,
        interestProfile: interestProfiles[0]!,
        profile: profiles[0]!,
      },
      {
        career: careers[1]!,
        interestProfile: null,
        profile: null,
      },
    ]),
    collegeRepository: new InMemoryCollegeRepository([]),
  });

  return app;
};

describe("career routes", () => {
  it("returns a published career", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/catalog/careers/data-scientist")
      .expect(200);

    const body = CareerToolResultSchema.parse(response.body);

    expect(body.data.career.title).toBe("Data Scientist");
    expect(body.data.profile?.reviewStatus).toBe("reviewed");
  });

  it("returns not found for draft and unknown careers", async () => {
    const draftResponse = await request(createTestApp())
      .get("/api/v1/catalog/careers/solar-panel-technician")
      .expect(404);
    const unknownResponse = await request(createTestApp())
      .get("/api/v1/catalog/careers/unknown-career")
      .expect(404);
    const draftError = ApiErrorSchema.parse(draftResponse.body);
    const unknownError = ApiErrorSchema.parse(unknownResponse.body);

    expect(draftError.code).toBe("CATALOG_ENTITY_NOT_FOUND");
    expect(unknownError.code).toBe("CATALOG_ENTITY_NOT_FOUND");
  });

  it("rejects an invalid career slug", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/catalog/careers/INVALID_SLUG!")
      .expect(400);

    expect(response.body).toEqual({
      code: "INVALID_CATALOG_QUERY",
      message: "Career slug is invalid",
    });
  });
});
