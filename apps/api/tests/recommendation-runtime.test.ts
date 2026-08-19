import { RecommendationSetResponseSchema } from "@yuvanext/contracts";
import { counselorFixtureIds, validRecommendationSet } from "@yuvanext/test-fixtures";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app/create-app.js";
import { createRecommendationFixtureRuntime } from "../src/app/create-recommendation-fixture-runtime.js";

const bearerToken = "synthetic-recommendation-token";

describe("recommendation set route", () => {
  const app = createApp({
    logging: false,
    databaseRequired: false,
    recommendations: createRecommendationFixtureRuntime(bearerToken),
  });

  it("returns an authenticated recommendation set", async () => {
    const response = await request(app)
      .get(`/api/v1/recommendations/${validRecommendationSet.recommendationId}`)
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(response.status).toBe(200);
    expect(RecommendationSetResponseSchema.parse(response.body as unknown)).toEqual({
      recommendation: validRecommendationSet,
    });
  });

  it("requires authentication", async () => {
    const response = await request(app).get(
      `/api/v1/recommendations/${validRecommendationSet.recommendationId}`,
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "authentication_required" });
  });

  it("rejects invalid IDs and hides missing recommendation sets", async () => {
    const invalid = await request(app)
      .get("/api/v1/recommendations/not-a-uuid")
      .set("Authorization", `Bearer ${bearerToken}`);
    const missing = await request(app)
      .get(`/api/v1/recommendations/${counselorFixtureIds.assistantTurnId}`)
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ code: "invalid_request" });
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ code: "recommendation_not_found" });
  });

  it("publishes the endpoint in OpenAPI", async () => {
    const response = await request(app).get("/openapi.json");
    const document = response.body as { paths: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(document.paths).toHaveProperty("/api/v1/recommendations/{recommendationId}");
  });
});
