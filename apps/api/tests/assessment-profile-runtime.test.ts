import { ProfileSnapshotResponseSchema } from "@yuvanext/contracts";
import { validProfileSnapshot } from "@yuvanext/test-fixtures";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app/create-app.js";
import { createAssessmentFixtureRuntime } from "../src/app/create-assessment-fixture-runtime.js";

const bearerToken = "synthetic-assessment-token";

describe("assessment profile snapshot route", () => {
  const app = createApp({
    logging: false,
    databaseRequired: false,
    assessment: createAssessmentFixtureRuntime(bearerToken),
  });

  it("returns the authenticated user's latest profile snapshot", async () => {
    const response = await request(app)
      .get("/api/v1/profile/snapshot")
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(response.status).toBe(200);
    expect(ProfileSnapshotResponseSchema.parse(response.body as unknown)).toEqual({
      profile: validProfileSnapshot,
    });
  });

  it("supports an explicit owned snapshot ID", async () => {
    const response = await request(app)
      .get("/api/v1/profile/snapshot")
      .query({ profileSnapshotId: validProfileSnapshot.snapshotId })
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      profile: { snapshotId: validProfileSnapshot.snapshotId },
    });
  });

  it("requires authentication and hides missing snapshots", async () => {
    const unauthorized = await request(app).get("/api/v1/profile/snapshot");
    const missing = await request(app)
      .get("/api/v1/profile/snapshot")
      .query({ profileSnapshotId: "00000000-0000-4000-8000-000000000499" })
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(unauthorized.status).toBe(401);
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ code: "profile_not_found" });
  });
});
