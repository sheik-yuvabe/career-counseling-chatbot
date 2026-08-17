import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  AssistantTurnSchema,
  ConversationHistoryResponseSchema,
  CreateExplorationEventRequestSchema,
  CreateJourneyEventRequestSchema,
  CreateJourneyEventResponseSchema,
  CreateReportRequestSchema,
  CreateShareCardRequestSchema,
  ExplorationEventResponseSchema,
  GeneratedAssetResponseSchema,
  JourneyResponseSchema,
  RenderReportAssetRequestSchema,
  ReportResponseSchema,
  SendConversationMessageRequestSchema,
  StartConversationRequestSchema,
  StartConversationResponseSchema,
  UuidSchema,
  type AssistantTurn,
  type ConversationHistoryResponse,
  type ExplorationEventResponse,
  type GeneratedAssetResponse,
  type CreateJourneyEventResponse,
  type JourneyResponse,
  type ReportResponse,
  type StartConversationResponse,
} from "@yuvanext/contracts";
import type { Express, NextFunction, Request, Response } from "express";
import {
  CounselorAccessError,
  CounselorConflictError,
  CounselorContractError,
  CounselorDependencyUnavailableError,
  CounselorNotFoundError,
  type CreateExplorationEventCommand,
  type CreateJourneyEventCommand,
  type CreateReportCommand,
  type CreateShareCardCommand,
  type GetConversationHistoryCommand,
  type GetJourneyCommand,
  type GetReportCommand,
  type RenderReportPdfCommand,
  type SendConversationMessageCommand,
  type StartConversationCommand,
} from "../application/index.js";

export type CounselorStartService = {
  execute(command: StartConversationCommand): Promise<StartConversationResponse>;
};

export type CounselorHistoryService = {
  execute(command: GetConversationHistoryCommand): Promise<ConversationHistoryResponse>;
};

export type CounselorJourneyService = {
  execute(command: GetJourneyCommand): Promise<JourneyResponse>;
};

export type CounselorCreateJourneyEventService = {
  execute(command: CreateJourneyEventCommand): Promise<CreateJourneyEventResponse>;
};

export type CounselorCreateExplorationEventService = {
  execute(command: CreateExplorationEventCommand): Promise<ExplorationEventResponse>;
};

export type CounselorCreateReportService = {
  execute(command: CreateReportCommand): Promise<ReportResponse>;
};

export type CounselorGetReportService = {
  execute(command: GetReportCommand): Promise<ReportResponse>;
};

export type CounselorReportAssetService = {
  renderPdf(command: RenderReportPdfCommand): Promise<GeneratedAssetResponse>;
  renderShareCard(command: CreateShareCardCommand): Promise<GeneratedAssetResponse>;
};

export type CounselorMessageService = {
  execute(command: SendConversationMessageCommand): Promise<AssistantTurn>;
};

export type ResolveCounselorUserId = (request: Request) => Promise<string | null>;

export type CounselorHttpDependencies = {
  startConversation?: CounselorStartService;
  getHistory?: CounselorHistoryService;
  getJourney?: CounselorJourneyService;
  createJourneyEvent?: CounselorCreateJourneyEventService;
  createExplorationEvent?: CounselorCreateExplorationEventService;
  createReport?: CounselorCreateReportService;
  getReport?: CounselorGetReportService;
  reportAssets?: CounselorReportAssetService;
  sendMessage?: CounselorMessageService;
  resolveUserId?: ResolveCounselorUserId;
};

const sendError = (response: Response, status: number, code: string, message: string): void => {
  response.status(status).json({ code, message });
};

const writeSseEvent = (response: Response, event: string, data: unknown): void => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const handleKnownError = (error: unknown, response: Response): boolean => {
  if (error instanceof CounselorDependencyUnavailableError) {
    sendError(response, 503, "counselor_dependency_unavailable", error.message);
    return true;
  }
  if (error instanceof CounselorAccessError || error instanceof CounselorNotFoundError) {
    sendError(response, 404, "conversation_not_found", "Conversation was not found.");
    return true;
  }
  if (error instanceof CounselorConflictError) {
    sendError(response, 409, "conversation_conflict", error.message);
    return true;
  }
  if (error instanceof CounselorContractError) {
    sendError(response, 422, "counselor_contract_error", error.message);
    return true;
  }
  return false;
};

export const registerCounselorRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: CounselorHttpDependencies = {},
): void => {
  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/conversations/{conversationId}/messages",
    tags: ["Counselor"],
    summary: "Get the authenticated user's ordered conversation history",
    security: [{ bearerAuth: [] }],
    request: {
      params: AssistantTurnSchema.pick({ conversationId: true }),
    },
    responses: {
      200: {
        description: "Conversation metadata and messages ordered by turn",
        content: {
          "application/json": { schema: ConversationHistoryResponseSchema },
        },
      },
      400: {
        description: "Invalid conversation ID",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/exploration/events",
    tags: ["Counselor"],
    summary: "Record an idempotent recommendation exploration action",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: CreateExplorationEventRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Stored exploration event",
        content: { "application/json": { schema: ExplorationEventResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Conversation, journey, or recommendation not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      422: {
        description: "Exploration reference mismatch",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/reports",
    tags: ["Counselor"],
    summary: "Create an immutable report snapshot from validated source snapshots",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: CreateReportRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Created report snapshot",
        content: { "application/json": { schema: ReportResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "A source snapshot was not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      422: {
        description: "Report source references do not agree",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/reports/{reportId}",
    tags: ["Counselor"],
    summary: "Get an authenticated user's immutable report snapshot",
    security: [{ bearerAuth: [] }],
    request: { params: ReportResponseSchema.shape.report.pick({ reportId: true }) },
    responses: {
      200: {
        description: "Report snapshot",
        content: { "application/json": { schema: ReportResponseSchema } },
      },
      400: {
        description: "Invalid report ID",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Report not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/reports/{reportId}/pdf",
    tags: ["Counselor"],
    summary: "Render and persist private report PDF metadata",
    security: [{ bearerAuth: [] }],
    request: {
      params: ReportResponseSchema.shape.report.pick({ reportId: true }),
      body: {
        required: true,
        content: { "application/json": { schema: RenderReportAssetRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Ready private report asset",
        content: { "application/json": { schema: GeneratedAssetResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Report not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Renderer unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/share-cards",
    tags: ["Counselor"],
    summary: "Render and persist privacy-safe share-card metadata",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: CreateShareCardRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Ready share-safe asset",
        content: { "application/json": { schema: GeneratedAssetResponseSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Report not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Renderer unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/journey",
    tags: ["Counselor"],
    summary: "Get the authenticated user's resumable journey state",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Current journey state",
        content: { "application/json": { schema: JourneyResponseSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Journey state not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/journey/events",
    tags: ["Counselor"],
    summary: "Append an idempotent journey event and advance the journey version",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: CreateJourneyEventRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Stored event and updated resumable journey",
        content: {
          "application/json": { schema: CreateJourneyEventResponseSchema },
        },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Journey or conversation not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      409: {
        description: "Journey lock version conflict",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/conversations",
    tags: ["Counselor"],
    summary: "Create or resume the authenticated user's active conversation",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: StartConversationRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Conversation created, resumed, or returned for an idempotent retry",
        content: {
          "application/json": { schema: StartConversationResponseSchema },
        },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Profile snapshot not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      409: {
        description: "Conversation state conflict",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      422: {
        description: "Counselor contract failure",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/conversations/{conversationId}/messages",
    tags: ["Counselor"],
    summary: "Send a user message and stream the grounded assistant turn",
    security: [{ bearerAuth: [] }],
    request: {
      params: AssistantTurnSchema.pick({ conversationId: true }),
      body: {
        required: true,
        content: {
          "application/json": { schema: SendConversationMessageRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "SSE stream containing assistant_turn and done events",
        content: { "text/event-stream": { schema: AssistantTurnSchema } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Conversation not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      409: {
        description: "Conversation state conflict",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      422: {
        description: "Counselor contract failure",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Counselor dependencies are unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.post(
    "/api/v1/conversations",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.startConversation || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }

      const body = StartConversationRequestSchema.safeParse(request.body);
      if (!body.success) {
        sendError(response, 400, "invalid_request", "The start conversation request is invalid.");
        return;
      }

      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        const result = StartConversationResponseSchema.parse(
          await dependencies.startConversation.execute({
            userId,
            request: body.data,
          }),
        );
        response.status(200).json(result);
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "profile_not_found", "Profile snapshot was not found.");
          return;
        }
        if (handleKnownError(error, response)) {
          return;
        }
        next(error);
      }
    },
  );

  app.get("/api/v1/journey", async (request: Request, response: Response, next: NextFunction) => {
    if (!dependencies.getJourney || !dependencies.resolveUserId) {
      sendError(response, 503, "counselor_unavailable", "The counselor service is not configured.");
      return;
    }

    try {
      const userId = await dependencies.resolveUserId(request);
      if (!userId) {
        sendError(response, 401, "authentication_required", "A valid bearer token is required.");
        return;
      }
      const journey = JourneyResponseSchema.parse(
        await dependencies.getJourney.execute({ userId }),
      );
      response.status(200).json(journey);
    } catch (error) {
      if (error instanceof CounselorNotFoundError) {
        sendError(response, 404, "journey_not_found", "Journey state was not found.");
        return;
      }
      if (handleKnownError(error, response)) {
        return;
      }
      next(error);
    }
  });

  app.post(
    "/api/v1/journey/events",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.createJourneyEvent || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }

      const body = CreateJourneyEventRequestSchema.safeParse(request.body);
      if (!body.success) {
        sendError(response, 400, "invalid_request", "The journey event request is invalid.");
        return;
      }

      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        const result = CreateJourneyEventResponseSchema.parse(
          await dependencies.createJourneyEvent.execute({
            userId,
            request: body.data,
          }),
        );
        response.status(200).json(result);
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "journey_not_found", "Journey state was not found.");
          return;
        }
        if (error instanceof CounselorConflictError) {
          sendError(response, 409, "journey_conflict", error.message);
          return;
        }
        if (handleKnownError(error, response)) {
          return;
        }
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/conversations/:conversationId/messages",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.getHistory || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }

      const conversationId = UuidSchema.safeParse(request.params.conversationId);
      if (!conversationId.success) {
        sendError(response, 400, "invalid_request", "The conversation ID is invalid.");
        return;
      }

      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        const history = ConversationHistoryResponseSchema.parse(
          await dependencies.getHistory.execute({
            userId,
            conversationId: conversationId.data,
          }),
        );
        response.status(200).json(history);
      } catch (error) {
        if (handleKnownError(error, response)) {
          return;
        }
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/conversations/:conversationId/messages",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.sendMessage || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }

      const conversationId = UuidSchema.safeParse(request.params.conversationId);
      const body = SendConversationMessageRequestSchema.safeParse(request.body);
      if (!conversationId.success || !body.success) {
        sendError(response, 400, "invalid_request", "The conversation message request is invalid.");
        return;
      }

      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        const turn = AssistantTurnSchema.parse(
          await dependencies.sendMessage.execute({
            userId,
            conversationId: conversationId.data,
            request: body.data,
          }),
        );

        response.status(200);
        response.set({
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Content-Type": "text/event-stream; charset=utf-8",
        });
        response.flushHeaders();
        writeSseEvent(response, "assistant_turn", turn);
        writeSseEvent(response, "done", {
          conversationId: turn.conversationId,
          turnId: turn.turnId,
        });
        response.end();
      } catch (error) {
        if (!response.headersSent && handleKnownError(error, response)) {
          return;
        }
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/exploration/events",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.createExplorationEvent || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }
      const body = CreateExplorationEventRequestSchema.safeParse(request.body);
      if (!body.success) {
        sendError(response, 400, "invalid_request", "The exploration event request is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response
          .status(200)
          .json(
            ExplorationEventResponseSchema.parse(
              await dependencies.createExplorationEvent.execute({ userId, request: body.data }),
            ),
          );
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "exploration_source_not_found", error.message);
          return;
        }
        if (handleKnownError(error, response)) return;
        next(error);
      }
    },
  );

  app.post("/api/v1/reports", async (request: Request, response: Response, next: NextFunction) => {
    if (!dependencies.createReport || !dependencies.resolveUserId) {
      sendError(response, 503, "counselor_unavailable", "The counselor service is not configured.");
      return;
    }
    const body = CreateReportRequestSchema.safeParse(request.body);
    if (!body.success) {
      sendError(response, 400, "invalid_request", "The report request is invalid.");
      return;
    }
    try {
      const userId = await dependencies.resolveUserId(request);
      if (!userId) {
        sendError(response, 401, "authentication_required", "A valid bearer token is required.");
        return;
      }
      response
        .status(200)
        .json(
          ReportResponseSchema.parse(
            await dependencies.createReport.execute({ userId, request: body.data }),
          ),
        );
    } catch (error) {
      if (error instanceof CounselorNotFoundError) {
        sendError(response, 404, "report_source_not_found", error.message);
        return;
      }
      if (handleKnownError(error, response)) return;
      next(error);
    }
  });

  app.get(
    "/api/v1/reports/:reportId",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.getReport || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }
      const reportId = UuidSchema.safeParse(request.params.reportId);
      if (!reportId.success) {
        sendError(response, 400, "invalid_request", "The report ID is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response
          .status(200)
          .json(
            ReportResponseSchema.parse(
              await dependencies.getReport.execute({ userId, reportId: reportId.data }),
            ),
          );
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "report_not_found", "Report was not found.");
          return;
        }
        if (handleKnownError(error, response)) return;
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/reports/:reportId/pdf",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.reportAssets || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }
      const reportId = UuidSchema.safeParse(request.params.reportId);
      const body = RenderReportAssetRequestSchema.safeParse(request.body);
      if (!reportId.success || !body.success) {
        sendError(response, 400, "invalid_request", "The report PDF request is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response.status(200).json(
          GeneratedAssetResponseSchema.parse(
            await dependencies.reportAssets.renderPdf({
              userId,
              reportId: reportId.data,
              request: body.data,
            }),
          ),
        );
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "report_not_found", "Report was not found.");
          return;
        }
        if (handleKnownError(error, response)) return;
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/share-cards",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.reportAssets || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "counselor_unavailable",
          "The counselor service is not configured.",
        );
        return;
      }
      const body = CreateShareCardRequestSchema.safeParse(request.body);
      if (!body.success) {
        sendError(response, 400, "invalid_request", "The share-card request is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response
          .status(200)
          .json(
            GeneratedAssetResponseSchema.parse(
              await dependencies.reportAssets.renderShareCard({ userId, request: body.data }),
            ),
          );
      } catch (error) {
        if (error instanceof CounselorNotFoundError) {
          sendError(response, 404, "report_not_found", "Report was not found.");
          return;
        }
        if (handleKnownError(error, response)) return;
        next(error);
      }
    },
  );
};
