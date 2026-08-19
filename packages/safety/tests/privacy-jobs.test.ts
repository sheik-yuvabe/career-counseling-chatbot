import { describe, expect, it } from "vitest";
import { PrivacyJobResponseSchema, type ResolvedPrivacyJobRequest } from "@yuvanext/contracts";
import { createSyntheticPrivacyJob, getSyntheticPrivacyJob } from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const requestedAt = "2026-07-30T12:00:00.000Z";

const request: ResolvedPrivacyJobRequest = {
  idempotencyKey: uuid,
  userId: "21111111-1111-4111-8111-111111111111",
  requestedBy: "21111111-1111-4111-8111-111111111111",
  authorizationMethod: "student_session",
  requestedAt,
  requestCorrelationId: uuid,
};

describe("privacy jobs", () => {
  it("creates a queued export job without an export asset", () => {
    const response = createSyntheticPrivacyJob("export", request);

    expect(PrivacyJobResponseSchema.parse(response).job).toMatchObject({
      jobId: uuid,
      jobType: "export",
      status: "queued",
      attemptCount: 0,
      requestedAt,
    });
    expect(response.job.resultAssetRef).toBeUndefined();
  });

  it("creates a queued delete job with a 72-hour deadline", () => {
    const response = createSyntheticPrivacyJob("delete", request);

    expect(response.job.jobType).toBe("delete");
    expect(response.job.deadlineAt).toBe("2026-08-02T12:00:00.000Z");
  });

  it("returns a synthetic job status response", () => {
    const response = getSyntheticPrivacyJob(uuid);

    expect(PrivacyJobResponseSchema.parse(response).auditEvent.action).toBe(
      "privacy.export.access",
    );
  });
});
