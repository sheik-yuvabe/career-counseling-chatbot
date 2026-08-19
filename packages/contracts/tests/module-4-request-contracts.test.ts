import {
  CreateJourneyEventRequestSchema,
  CreateReportRequestSchema,
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const profileSnapshotId = "00000000-0000-4000-8000-000000000406";
const idempotencyKey = "00000000-0000-4000-8000-000000000494";

describe("Module 4 client request contracts", () => {
  it("keeps report source selection on the server", () => {
    expect(
      CreateReportRequestSchema.parse({ profileSnapshotId, idempotencyKey }),
    ).toEqual({ profileSnapshotId, idempotencyKey });
    expect(
      CreateReportRequestSchema.safeParse({
        profileSnapshotId,
        recommendationIds: ["00000000-0000-4000-8000-000000000407"],
        idempotencyKey,
      }).success,
    ).toBe(false);
  });

  it("keeps journey concurrency and event metadata on the server", () => {
    expect(
      CreateJourneyEventRequestSchema.parse({
        eventType: "career_opened",
        relatedEntityId: "00000000-0000-4000-8000-000000000408",
        idempotencyKey,
      }),
    ).toEqual({
      eventType: "career_opened",
      relatedEntityId: "00000000-0000-4000-8000-000000000408",
      idempotencyKey,
    });
    expect(
      CreateJourneyEventRequestSchema.safeParse({
        eventType: "career_opened",
        expectedLockVersion: 0,
        idempotencyKey,
      }).success,
    ).toBe(false);
  });
});
