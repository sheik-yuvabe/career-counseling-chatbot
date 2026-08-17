import {
  ApiErrorSchema,
  CreateHandoffRequestSchema,
  CreateHandoffResponseSchema,
  type CreateHandoffResponse,
  type OpenAPIRegistry,
  PrivacyJobPathParamsSchema,
  PrivacyJobRequestSchema,
  PrivacyJobResponseSchema,
  type PrivacyJobResponse,
  SafetyCheckRequestSchema,
  SafetyCheckResponseSchema,
  type SafetyCheckResponse,
  StaffPacketPathParamsSchema,
  StaffPacketQuerySchema,
  StaffPacketResponseSchema,
  type StaffPacketResponse,
  StaffQueueResponseSchema,
  StaffQueueActionPathParamsSchema,
  StaffQueueActionRequestSchema,
  StaffQueueActionResponseSchema,
  type StaffQueueActionResponse,
  type StaffQueueResponse,
} from "@yuvanext/contracts";
import type { Express } from "express";
import { createSyntheticHandoffPacket } from "../domain/handoff-packets.js";
import { createSyntheticPrivacyJob, getSyntheticPrivacyJob } from "../domain/privacy-jobs.js";
import { createSyntheticQueueAction } from "../domain/queue-actions.js";
import { evaluateSafetyCheck } from "../domain/safety-rules.js";
import { createSyntheticStaffPacketView } from "../domain/staff-packets.js";
import { listSyntheticStaffQueue } from "../domain/staff-queue.js";
import type { PrivacyJobRepository } from "../infrastructure/privacy-job-repository.js";
import type { SafetyOperationsRepository } from "../infrastructure/safety-operations-repository.js";

export type SafetyRouteDependencies = {
  privacyJobRepository?: PrivacyJobRepository;
  safetyOperationsRepository?: SafetyOperationsRepository;
};

export const registerSafetyRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: SafetyRouteDependencies = {},
): void => {
  registry.registerPath({
    method: "post",
    path: "/api/v1/internal/safety/check",
    tags: ["Safety"],
    summary: "Run the Module 5 safety pre-check before general AI processing",
    request: {
      body: {
        content: {
          "application/json": {
            schema: SafetyCheckRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Safety decision",
        content: { "application/json": { schema: SafetyCheckResponseSchema } },
      },
      400: {
        description: "Invalid safety check request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/internal/safety/check", async (request, response) => {
    const parsedRequest = SafetyCheckRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      response.status(400).json({
        code: "invalid_safety_check_request",
        message: "Safety check request body is invalid.",
      });
      return;
    }

    const body: SafetyCheckResponse = dependencies.safetyOperationsRepository
      ? await dependencies.safetyOperationsRepository.runSafetyCheck(parsedRequest.data)
      : { decision: evaluateSafetyCheck(parsedRequest.data) };

    response.status(200).json(SafetyCheckResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/internal/handoffs",
    tags: ["Safety"],
    summary: "Create a Module 5 handoff packet for queue integration",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateHandoffRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Handoff packet created",
        content: { "application/json": { schema: CreateHandoffResponseSchema } },
      },
      400: {
        description: "Invalid handoff request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/internal/handoffs", async (request, response) => {
    const parsedRequest = CreateHandoffRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      response.status(400).json({
        code: "invalid_handoff_request",
        message: "Handoff request body is invalid.",
      });
      return;
    }

    const body: CreateHandoffResponse = dependencies.safetyOperationsRepository
      ? await dependencies.safetyOperationsRepository.createHandoff(parsedRequest.data)
      : { packet: createSyntheticHandoffPacket(parsedRequest.data) };

    response.status(201).json(CreateHandoffResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/staff/queue",
    tags: ["Staff"],
    summary: "List staff handoff queue items for Module 5",
    responses: {
      200: {
        description: "Staff queue items ordered by priority and queue time",
        content: { "application/json": { schema: StaffQueueResponseSchema } },
      },
    },
  });

  app.get("/api/v1/staff/queue", async (_request, response) => {
    const body: StaffQueueResponse = dependencies.safetyOperationsRepository
      ? await dependencies.safetyOperationsRepository.listStaffQueue()
      : { items: listSyntheticStaffQueue() };

    response.status(200).json(StaffQueueResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/staff/queue/{id}/action",
    tags: ["Staff"],
    summary: "Record a staff action for a handoff queue item",
    request: {
      params: StaffQueueActionPathParamsSchema,
      body: {
        content: {
          "application/json": {
            schema: StaffQueueActionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Staff queue action recorded",
        content: { "application/json": { schema: StaffQueueActionResponseSchema } },
      },
      400: {
        description: "Invalid staff queue action request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Staff queue item not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/staff/queue/:id/action", async (request, response) => {
    const parsedParams = StaffQueueActionPathParamsSchema.safeParse(request.params);
    const parsedRequest = StaffQueueActionRequestSchema.safeParse(request.body);

    if (!parsedParams.success || !parsedRequest.success) {
      response.status(400).json({
        code: "invalid_staff_queue_action_request",
        message: "Staff queue action request is invalid.",
      });
      return;
    }

    const body: StaffQueueActionResponse | undefined = dependencies.safetyOperationsRepository
      ? await dependencies.safetyOperationsRepository.recordQueueAction(
          parsedParams.data.id,
          parsedRequest.data,
        )
      : createSyntheticQueueAction(parsedParams.data.id, parsedRequest.data);

    if (!body) {
      response.status(404).json({
        code: "staff_queue_item_not_found",
        message: "Staff queue item was not found.",
      });
      return;
    }

    response.status(200).json(StaffQueueActionResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/staff/packets/{userId}",
    tags: ["Staff"],
    summary: "View a privacy-restricted staff packet",
    request: {
      params: StaffPacketPathParamsSchema,
      query: StaffPacketQuerySchema,
    },
    responses: {
      200: {
        description: "Staff packet with safe audit event",
        content: { "application/json": { schema: StaffPacketResponseSchema } },
      },
      400: {
        description: "Invalid staff packet request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Staff packet not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/staff/packets/:userId", async (request, response) => {
    const parsedParams = StaffPacketPathParamsSchema.safeParse(request.params);
    const parsedQuery = StaffPacketQuerySchema.safeParse(request.query);

    if (!parsedParams.success || !parsedQuery.success) {
      response.status(400).json({
        code: "invalid_staff_packet_request",
        message: "Staff packet request is invalid.",
      });
      return;
    }

    const includeFlaggedExcerpt = parsedQuery.data.includeFlaggedExcerpt === "true";
    const body: StaffPacketResponse | undefined = dependencies.safetyOperationsRepository
      ? await dependencies.safetyOperationsRepository.getStaffPacket(
          parsedParams.data.userId,
          includeFlaggedExcerpt,
        )
      : createSyntheticStaffPacketView(
          parsedParams.data.userId,
          includeFlaggedExcerpt,
          parsedParams.data.userId,
        );

    if (!body) {
      response.status(404).json({
        code: "staff_packet_not_found",
        message: "Staff packet was not found.",
      });
      return;
    }

    response.status(200).json(StaffPacketResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/privacy/export",
    tags: ["Privacy"],
    summary: "Create a privacy export job",
    request: {
      body: {
        content: {
          "application/json": {
            schema: PrivacyJobRequestSchema,
          },
        },
      },
    },
    responses: {
      202: {
        description: "Privacy export job queued",
        content: { "application/json": { schema: PrivacyJobResponseSchema } },
      },
      400: {
        description: "Invalid privacy export request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/privacy/export", async (request, response) => {
    const parsedRequest = PrivacyJobRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      response.status(400).json({
        code: "invalid_privacy_export_request",
        message: "Privacy export request body is invalid.",
      });
      return;
    }

    const body: PrivacyJobResponse = dependencies.privacyJobRepository
      ? await dependencies.privacyJobRepository.createJob("export", parsedRequest.data)
      : createSyntheticPrivacyJob("export", parsedRequest.data);

    response.status(202).json(PrivacyJobResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/privacy/delete",
    tags: ["Privacy"],
    summary: "Create a privacy delete job",
    request: {
      body: {
        content: {
          "application/json": {
            schema: PrivacyJobRequestSchema,
          },
        },
      },
    },
    responses: {
      202: {
        description: "Privacy delete job queued",
        content: { "application/json": { schema: PrivacyJobResponseSchema } },
      },
      400: {
        description: "Invalid privacy delete request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post("/api/v1/privacy/delete", async (request, response) => {
    const parsedRequest = PrivacyJobRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      response.status(400).json({
        code: "invalid_privacy_delete_request",
        message: "Privacy delete request body is invalid.",
      });
      return;
    }

    const body: PrivacyJobResponse = dependencies.privacyJobRepository
      ? await dependencies.privacyJobRepository.createJob("delete", parsedRequest.data)
      : createSyntheticPrivacyJob("delete", parsedRequest.data);

    response.status(202).json(PrivacyJobResponseSchema.parse(body));
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/privacy/jobs/{id}",
    tags: ["Privacy"],
    summary: "Get a privacy job status",
    request: {
      params: PrivacyJobPathParamsSchema,
    },
    responses: {
      200: {
        description: "Privacy job status",
        content: { "application/json": { schema: PrivacyJobResponseSchema } },
      },
      400: {
        description: "Invalid privacy job request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Privacy job not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/privacy/jobs/:id", async (request, response) => {
    const parsedParams = PrivacyJobPathParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        code: "invalid_privacy_job_request",
        message: "Privacy job request is invalid.",
      });
      return;
    }

    const body: PrivacyJobResponse | undefined = dependencies.privacyJobRepository
      ? await dependencies.privacyJobRepository.getJob(parsedParams.data.id)
      : getSyntheticPrivacyJob(parsedParams.data.id);

    if (!body) {
      response.status(404).json({
        code: "privacy_job_not_found",
        message: "Privacy job was not found.",
      });
      return;
    }

    response.status(200).json(PrivacyJobResponseSchema.parse(body));
  });
};
