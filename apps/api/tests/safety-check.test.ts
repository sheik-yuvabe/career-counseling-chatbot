import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  CreateHandoffResponseSchema,
  PrivacyJobResponseSchema,
  SafetyCheckResponseSchema,
  StaffPacketResponseSchema,
  StaffQueueActionResponseSchema,
  StaffQueueResponseSchema,
} from "@yuvanext/contracts";
import { z } from "zod";
import { createApp } from "../src/app/create-app.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-28T10:00:00.000Z";
const OpenApiPathsSchema = z.object({ paths: z.record(z.string(), z.unknown()) });

const buildRequestBody = (message: string): Record<string, unknown> => ({
  sourceEventId: uuid,
  triggerType: "message",
  message,
  occurredAt: timestamp,
  context: {
    userId: uuid,
    sessionId: uuid,
    segment: "explorer",
  },
});

describe("POST /api/v1/internal/safety/check", () => {
  it("returns a non-triggered decision for normal career questions", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/safety/check")
      .send(buildRequestBody("Which careers match biology and design after class 12?"));

    expect(response.status).toBe(200);
    expect(SafetyCheckResponseSchema.parse(response.body)).toEqual({
      decision: {
        decisionId: uuid,
        triggered: false,
        pauseJourney: false,
        createHandoff: false,
      },
    });
  });

  it("returns a Tier 1 mock SAFETY.md decision", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/safety/check")
      .send(buildRequestBody("I am in immediate danger"));

    expect(response.status).toBe(200);
    expect(SafetyCheckResponseSchema.parse(response.body)).toEqual({
      decision: {
        decisionId: uuid,
        triggered: true,
        tier: "tier_1",
        approvedMessageKey: "mock_safety.tier_1",
        approvedMessageVersion: "mock-safety-md-v1",
        pauseJourney: true,
        createHandoff: true,
      },
    });
  });

  it.each([
    ["I am thinking about self harm", "tier_2", "mock_safety.tier_2", true, true],
    ["I feel overwhelmed by everything", "tier_3", "mock_safety.tier_3", false, false],
  ] as const)(
    "returns a %s mock SAFETY.md decision",
    async (message, expectedTier, expectedMessageKey, pauseJourney, createHandoff) => {
      const response = await request(createApp({ logging: false }))
        .post("/api/v1/internal/safety/check")
        .send(buildRequestBody(message));

      expect(response.status).toBe(200);
      expect(SafetyCheckResponseSchema.parse(response.body)).toEqual({
        decision: {
          decisionId: uuid,
          triggered: true,
          tier: expectedTier,
          approvedMessageKey: expectedMessageKey,
          approvedMessageVersion: "mock-safety-md-v1",
          pauseJourney,
          createHandoff,
        },
      });
    },
  );

  it("returns 400 for invalid requests", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/safety/check")
      .send({ message: "" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_safety_check_request",
      message: "Safety check request body is invalid.",
    });
  });

  it("publishes the safety check endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/internal/safety/check"]).toBeDefined();
  });
});

describe("POST /api/v1/internal/handoffs", () => {
  it("creates an alerted Tier 1 handoff packet", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/handoffs")
      .send({
        idempotencyKey: uuid,
        userId: uuid,
        reason: "tier_1",
        user: {
          firstName: "Asha",
          ageBand: "16-18",
          segment: "explorer",
        },
        profile: {
          profileSnapshotId: uuid,
          code: "RIA",
          confidence: "normal",
        },
        trigger: {
          occurredAt: timestamp,
        },
        consentedContactAvailable: true,
        requestCorrelationId: uuid,
      });

    expect(response.status).toBe(201);
    expect(CreateHandoffResponseSchema.parse(response.body)).toEqual({
      packet: {
        handoffId: uuid,
        user: {
          firstName: "Asha",
          ageBand: "16-18",
          segment: "explorer",
        },
        profile: {
          profileSnapshotId: uuid,
          code: "RIA",
          confidence: "normal",
        },
        trigger: {
          reason: "tier_1",
          occurredAt: timestamp,
        },
        consentedContactAvailable: true,
        status: "alerted",
      },
    });
  });

  it("returns 400 for invalid handoff requests", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/internal/handoffs")
      .send({ reason: "tier_1" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_handoff_request",
      message: "Handoff request body is invalid.",
    });
  });

  it("publishes the handoff endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/internal/handoffs"]).toBeDefined();
  });
});

describe("GET /api/v1/staff/queue", () => {
  it("returns synthetic queue items ordered by priority", async () => {
    const response = await request(createApp({ logging: false })).get("/api/v1/staff/queue");

    expect(response.status).toBe(200);
    const body = StaffQueueResponseSchema.parse(response.body);
    expect(body.items.map((item) => item.priority)).toEqual([1, 2, 3]);
    expect(body.items[0]?.reason).toBe("tier_1");
    expect(body.items[0]?.status).toBe("alerted");
  });

  it("publishes the staff queue endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/staff/queue"]).toBeDefined();
  });
});

describe("POST /api/v1/staff/queue/:id/action", () => {
  it("records an actioned queue item and safe audit event", async () => {
    const response = await request(createApp({ logging: false }))
      .post(`/api/v1/staff/queue/${uuid}/action`)
      .send({
        idempotencyKey: uuid,
        actorStaffId: uuid,
        actionType: "actioned",
        actionCategory: "guardian_contacted",
        note: "Synthetic counselor note for POC action.",
        occurredAt: timestamp,
        requestCorrelationId: uuid,
      });

    expect(response.status).toBe(200);
    const body = StaffQueueActionResponseSchema.parse(response.body);
    expect(body.action).toMatchObject({
      actionId: uuid,
      handoffId: uuid,
      actionType: "actioned",
      actionCategory: "guardian_contacted",
      noteRecorded: true,
    });
    expect(body.item.status).toBe("actioned");
    expect(body.auditEvent.safeMetadata).toEqual({
      actionType: "actioned",
      actionCategory: "guardian_contacted",
      noteRecorded: true,
    });
  });

  it("returns 400 for invalid queue action requests", async () => {
    const response = await request(createApp({ logging: false }))
      .post(`/api/v1/staff/queue/${uuid}/action`)
      .send({ actionType: "actioned" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_staff_queue_action_request",
      message: "Staff queue action request is invalid.",
    });
  });

  it("publishes the staff queue action endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/staff/queue/{id}/action"]).toBeDefined();
  });
});

describe("GET /api/v1/staff/packets/:userId", () => {
  it("returns a staff packet without conversation excerpts by default", async () => {
    const response = await request(createApp({ logging: false })).get(
      `/api/v1/staff/packets/${uuid}`,
    );

    expect(response.status).toBe(200);
    const body = StaffPacketResponseSchema.parse(response.body);
    expect(body.packet.userId).toBe(uuid);
    expect(body.packet.conversationExcerpts).toBeUndefined();
    expect(body.auditEvent.action).toBe("staff.packet.view");
  });

  it("returns flagged excerpts only when requested", async () => {
    const response = await request(createApp({ logging: false })).get(
      `/api/v1/staff/packets/${uuid}?includeFlaggedExcerpt=true`,
    );

    expect(response.status).toBe(200);
    const body = StaffPacketResponseSchema.parse(response.body);
    expect(body.packet.conversationExcerpts).toHaveLength(1);
    expect(body.auditEvent.safeMetadata).toMatchObject({
      includeFlaggedExcerpt: true,
      hasSafetyEvent: true,
      highestTier: "tier_1",
    });
  });

  it("returns 400 for invalid packet requests", async () => {
    const response = await request(createApp({ logging: false })).get(
      "/api/v1/staff/packets/not-a-uuid",
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_staff_packet_request",
      message: "Staff packet request is invalid.",
    });
  });

  it("publishes the staff packet endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/staff/packets/{userId}"]).toBeDefined();
  });
});

describe("privacy job endpoints", () => {
  const privacyJobRequest = {
    idempotencyKey: uuid,
    userId: uuid,
    requestedBy: uuid,
    authorizationMethod: "student_session",
    requestedAt: "2026-07-30T12:00:00.000Z",
    requestCorrelationId: uuid,
  };

  it("queues an export job through the configured repository", async () => {
    const response = await request(
      createApp({
        logging: false,
        privacyJobRepository: {
          createJob(jobType, parsedRequest) {
            return Promise.resolve({
              job: {
                jobId: parsedRequest.idempotencyKey,
                userId: parsedRequest.userId,
                jobType,
                status: "queued",
                deadlineAt: "2026-07-31T12:00:00.000Z",
                attemptCount: 0,
                requestedAt: parsedRequest.requestedAt,
              },
              auditEvent: {
                id: parsedRequest.requestCorrelationId,
                actorType: "user",
                actorId: parsedRequest.requestedBy,
                action: "privacy.export.request",
                targetType: "privacy_job",
                targetId: parsedRequest.idempotencyKey,
                requestCorrelationId: parsedRequest.requestCorrelationId,
                safeMetadata: { repository: "fake" },
                ipHash: null,
                occurredAt: parsedRequest.requestedAt,
              },
            });
          },
          getJob() {
            return Promise.resolve(undefined);
          },
        },
      }),
    )
      .post("/api/v1/privacy/export")
      .send(privacyJobRequest);

    expect(response.status).toBe(202);
    const body = PrivacyJobResponseSchema.parse(response.body);
    expect(body.auditEvent.safeMetadata).toEqual({ repository: "fake" });
  });

  it("returns 404 when configured repository cannot find a privacy job", async () => {
    const response = await request(
      createApp({
        logging: false,
        privacyJobRepository: {
          createJob() {
            return Promise.reject(new Error("not used"));
          },
          getJob() {
            return Promise.resolve(undefined);
          },
        },
      }),
    ).get(`/api/v1/privacy/jobs/${uuid}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: "privacy_job_not_found",
      message: "Privacy job was not found.",
    });
  });

  it("queues an export job", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/privacy/export")
      .send(privacyJobRequest);

    expect(response.status).toBe(202);
    const body = PrivacyJobResponseSchema.parse(response.body);
    expect(body.job).toMatchObject({
      jobId: uuid,
      jobType: "export",
      status: "queued",
      attemptCount: 0,
    });
    expect(body.auditEvent.action).toBe("privacy.export.request");
  });

  it("queues a delete job", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/privacy/delete")
      .send(privacyJobRequest);

    expect(response.status).toBe(202);
    const body = PrivacyJobResponseSchema.parse(response.body);
    expect(body.job.jobType).toBe("delete");
    expect(body.job.deadlineAt).toBe("2026-08-02T12:00:00.000Z");
    expect(body.auditEvent.action).toBe("privacy.delete.request");
  });

  it("gets a privacy job status", async () => {
    const response = await request(createApp({ logging: false })).get(
      `/api/v1/privacy/jobs/${uuid}`,
    );

    expect(response.status).toBe(200);
    const body = PrivacyJobResponseSchema.parse(response.body);
    expect(body.job.jobId).toBe(uuid);
    expect(body.auditEvent.action).toBe("privacy.export.access");
  });

  it("returns 400 for invalid privacy job requests", async () => {
    const response = await request(createApp({ logging: false }))
      .post("/api/v1/privacy/export")
      .send({ jobType: "export" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_privacy_export_request",
      message: "Privacy export request body is invalid.",
    });
  });

  it("publishes privacy endpoints in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");

    expect(response.status).toBe(200);
    const body = OpenApiPathsSchema.parse(response.body);
    expect(body.paths["/api/v1/privacy/export"]).toBeDefined();
    expect(body.paths["/api/v1/privacy/delete"]).toBeDefined();
    expect(body.paths["/api/v1/privacy/jobs/{id}"]).toBeDefined();
  });
});
