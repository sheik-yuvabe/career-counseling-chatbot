import { describe, expect, it } from "vitest";
import request from "supertest";
import type { JourneySession } from "@yuvanext/contracts";
import { JourneySessionResponseSchema } from "@yuvanext/contracts";
import { createApp } from "../src/app/create-app.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("Journey session routes", () => {
  it("publishes Journey Session endpoints in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = JSON.parse(response.text) as { paths: Record<string, unknown> };
    expect(body.paths["/api/v1/journey-sessions"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/resume"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/user-profile"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/intake/questions"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/intake/answers/{questionId}"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/assessment-runs"]).toBeDefined();
    expect(body.paths["/api/v1/journey-sessions/{sessionId}/work-values-runs"]).toBeUndefined();
    expect(body.paths["/api/v1/assessment-runs/{runId}/next"]).toBeDefined();
    expect(body.paths["/api/v1/assessment-runs/{runId}/responses"]).toBeDefined();
    expect(body.paths["/api/v1/assessment-runs/{runId}/score"]).toBeDefined();
    expect(
      body.paths["/api/v1/journey-sessions/{sessionId}/assessment-runs/{runId}/profile-snapshot"],
    ).toBeDefined();
  });

  it("validates the authenticated actor header before creating a session", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/journey-sessions")
      .send({});

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text)).toMatchObject({ code: "invalid_request" });
  });

  it("returns storage unavailable when the database is not configured", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/journey-sessions")
      .set("x-yuvanext-user-id", userId)
      .send({});

    expect(response.status).toBe(503);
    expect(JSON.parse(response.text)).toMatchObject({ code: "database_unavailable" });
  });

  it("parses the journey session response contract", () => {
    const session: JourneySession = {
      id: "33333333-3333-4333-8333-333333333333",
      userId,
      anonymousSessionId: null,
      channel: "web",
      status: "active",
      startedAt: "2026-07-28T10:00:00.000Z",
      lastSeenAt: "2026-07-28T10:00:00.000Z",
      expiresAt: "2026-08-04T10:00:00.000Z",
      completedAt: null,
    };

    expect(JourneySessionResponseSchema.parse({ session }).session.id).toBe(session.id);
  });
});
