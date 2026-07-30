import { describe, expect, it } from "vitest";
import request from "supertest";
import { HealthResponseSchema } from "@yuvanext/contracts";
import { z } from "zod";
import { createApp } from "../src/app/create-app.js";

const OpenApiPathsSchema = z.object({ paths: z.record(z.string(), z.unknown()) });

describe("GET /api/v1/health", () => {
  it("returns all registered backend modules", async () => {
    const response = await request(createApp({ logging: false })).get("/api/v1/health");

    expect(response.status).toBe(200);
    const body = HealthResponseSchema.parse(JSON.parse(response.text) as unknown);
    expect(body.status).toBe("ok");
    expect(body.modules).toHaveLength(6);
    expect(body.modules.map((module) => module.code)).toEqual([
      "m1",
      "m2",
      "m3",
      "m4",
      "m5-safety",
      "m5-evaluation",
    ]);
  });

  it("publishes OpenAPI JSON for the shared testing UI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");
    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(JSON.parse(response.text) as unknown);
    expect(body.paths["/api/v1/health"]).toBeDefined();
    expect(body.paths["/api/v1/catalog/colleges"]).toBeDefined();
    expect(body.paths["/api/v1/catalog/careers/{slug}"]).toBeDefined();
    expect(body.paths["/api/v1/catalog/careers/search"]).toBeDefined();
  });
});
