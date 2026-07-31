import { describe, expect, it } from "vitest";
import request from "supertest";
import { RecommendationSetSchema } from "@yuvanext/contracts";
import { z } from "zod";
import { createApp } from "../src/app/create-app.js";

const OpenApiPathsSchema = z.object({ paths: z.record(z.string(), z.unknown()) });

const createdAt = "2026-07-28T00:00:00.000Z";
const routeId = "00000000-0000-4000-8000-000000006001";

const config = {
  algorithmVersion: "api-mvp-v1",
  weightsVersion: "api-weights-v1",
  interestWeight: 0.5,
  valuesWeight: 0.2,
  feasibilityWeight: 0.15,
  contextWeight: 0.15,
  roundingScale: 6,
  feasibilityLookupVersion: "feasibility-v1",
  riasecTieOrder: ["R", "I", "A", "S", "E", "C"],
};

const profile = {
  profileSnapshotId: "00000000-0000-4000-8000-000000006100",
  profileVersion: "profile-v1",
  profileHash: "profile-hash",
  segment: "pathfinder",
  state: "Tamil Nadu",
  marksBand: "high",
  riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
};

describe("recommendation routes", () => {
  it("returns deterministic career recommendations from request payload data", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/recommendations/careers")
      .send({
        recommendationId: "career-api-rec-1",
        profile,
        config,
        createdAt,
        careers: [
          {
            careerId: "00000000-0000-4000-8000-000000006201",
            title: "Data Scientist",
            riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
            routeIds: [routeId],
            datasetVersion: "careers-2026-a",
            verified: true,
            isVocationalRoute: false,
          },
        ],
      });

    expect(response.status).toBe(200);
    const body = RecommendationSetSchema.parse(JSON.parse(response.text) as unknown);
    expect(body.kind).toBe("career");
    expect(body.items[0]?.title).toBe("Data Scientist");
  });

  it("fetches and replays a stored recommendation set", async () => {
    const app = createApp({ logging: false });
    const recommendationId = "career-api-rec-fetch";
    const createResponse = await request(app)
      .post("/api/v1/recommendations/careers")
      .send({
        recommendationId,
        profile,
        config,
        createdAt,
        careers: [
          {
            careerId: "00000000-0000-4000-8000-000000006202",
            title: "Data Scientist",
            riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
            routeIds: [routeId],
            datasetVersion: "careers-2026-a",
            verified: true,
            isVocationalRoute: false,
          },
        ],
      });
    const created = RecommendationSetSchema.parse(JSON.parse(createResponse.text) as unknown);

    const fetchResponse = await request(app).get(`/api/v1/recommendations/${recommendationId}`);
    expect(fetchResponse.status).toBe(200);
    const fetched = RecommendationSetSchema.parse(JSON.parse(fetchResponse.text) as unknown);
    expect(fetched.outputHash).toBe(created.outputHash);

    const replayResponse = await request(app).post(`/api/v1/recommendations/${recommendationId}/replay`);
    expect(replayResponse.status).toBe(200);
    expect(JSON.parse(replayResponse.text)).toMatchObject({
      recommendationId,
      originalOutputHash: created.outputHash,
      replayOutputHash: created.outputHash,
      matches: true,
    });
  });

  it("rejects duplicate recommendation ids because completed outputs are immutable", async () => {
    const app = createApp({ logging: false });
    const payload = {
      recommendationId: "career-api-rec-duplicate",
      profile,
      config,
      createdAt,
      careers: [
        {
          careerId: "00000000-0000-4000-8000-000000006203",
          title: "Data Scientist",
          riasec: { R: 2, I: 10, A: 8, S: 4, E: 3, C: 1 },
          routeIds: [routeId],
          datasetVersion: "careers-2026-a",
          verified: true,
          isVocationalRoute: false,
        },
      ],
    };

    expect((await request(app).post("/api/v1/recommendations/careers").send(payload)).status).toBe(200);
    const duplicate = await request(app).post("/api/v1/recommendations/careers").send(payload);

    expect(duplicate.status).toBe(409);
    expect(JSON.parse(duplicate.text)).toMatchObject({
      code: "recommendation_already_exists",
    });
  });

  it("rejects invalid recommendation request bodies", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/recommendations/careers")
      .send({ recommendationId: "missing-required-fields" });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text)).toMatchObject({
      code: "invalid_recommendation_request",
    });
  });

  it("publishes OpenAPI paths for MVP recommendation endpoints", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");
    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(JSON.parse(response.text) as unknown);

    expect(body.paths["/api/v1/recommendations/careers"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/streams"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/pathways"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/colleges"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/aid"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/plans"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/{id}"]).toBeDefined();
    expect(body.paths["/api/v1/recommendations/{id}/replay"]).toBeDefined();
  });
});
