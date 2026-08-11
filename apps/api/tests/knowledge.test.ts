import { CollegeListResponseSchema } from "@yuvanext/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app/create-app.js";

describe("Module 3 composition", () => {
  it("mounts the college catalog route", async () => {
    const response = await request(createApp({ logging: false }))
      .get("/api/v1/catalog/colleges")
      .query({ state: "Tamil Nadu" })
      .expect(200);

    const body = CollegeListResponseSchema.parse(response.body);

    expect(body.data).toEqual([]);
    expect(body.sourceDataVersions).toEqual({});
  });
});
