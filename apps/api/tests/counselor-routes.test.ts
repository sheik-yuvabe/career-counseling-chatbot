import {
  counselorFixtureIds,
  validAssistantTurn,
  validConversation,
  validJourneyState,
  validSendConversationMessageRequest,
  validStartConversationRequest,
} from "@yuvanext/test-fixtures";
import type { StartConversationCommand } from "@yuvanext/counselor";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../src/app/create-app.js";

const userId = "00000000-0000-4000-8000-000000000400";
const OpenApiPathsSchema = z.object({ paths: z.record(z.string(), z.unknown()) });
const ConversationMessagesPathSchema = z.object({
  get: z.unknown(),
  post: z.unknown(),
});
const startResponse = {
  conversation: validConversation,
  journey: validJourneyState,
  welcomeTurn: validAssistantTurn,
};
const createStartExecute = () =>
  vi.fn((command: StartConversationCommand) => {
    void command;
    return Promise.resolve(startResponse);
  });

describe("POST /api/v1/conversations", () => {
  it("creates or resumes a conversation for the authenticated user", async () => {
    const execute = createStartExecute();
    const app = createApp({
      logging: false,
      counselor: {
        startConversation: { execute },
        resolveUserId: () => Promise.resolve(userId),
      },
    });

    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", "Bearer synthetic-token")
      .send(validStartConversationRequest);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(startResponse);
    expect(execute).toHaveBeenCalledWith({
      userId,
      request: validStartConversationRequest,
    });
  });

  it("preserves idempotency across repeated HTTP requests", async () => {
    const execute = createStartExecute();
    const app = createApp({
      logging: false,
      counselor: {
        startConversation: { execute },
        resolveUserId: () => Promise.resolve(userId),
      },
    });

    const first = await request(app)
      .post("/api/v1/conversations")
      .send(validStartConversationRequest);
    const retry = await request(app)
      .post("/api/v1/conversations")
      .send(validStartConversationRequest);

    expect(retry.body).toEqual(first.body);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls.map(([command]) => command.request)).toEqual([
      validStartConversationRequest,
      validStartConversationRequest,
    ]);
  });

  it("rejects unauthenticated and invalid start requests", async () => {
    const execute = createStartExecute();
    const unauthenticatedApp = createApp({
      logging: false,
      counselor: {
        startConversation: { execute },
        resolveUserId: () => Promise.resolve(null),
      },
    });
    const authenticatedApp = createApp({
      logging: false,
      counselor: {
        startConversation: { execute },
        resolveUserId: () => Promise.resolve(userId),
      },
    });

    const unauthenticated = await request(unauthenticatedApp)
      .post("/api/v1/conversations")
      .send(validStartConversationRequest);
    const invalid = await request(authenticatedApp)
      .post("/api/v1/conversations")
      .send({ ...validStartConversationRequest, idempotencyKey: "invalid" });

    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({ code: "authentication_required" });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ code: "invalid_request" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("publishes the start endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");
    const body = OpenApiPathsSchema.parse(response.body);

    expect(body.paths["/api/v1/conversations"]).toBeDefined();
    expect(body.paths["/api/v1/journey"]).toBeDefined();
    expect(body.paths["/api/v1/journey/events"]).toBeDefined();
  });
});

describe("POST /api/v1/conversations/:conversationId/messages", () => {
  it("streams the assistant turn and terminal event", async () => {
    const execute = vi.fn(() => Promise.resolve(validAssistantTurn));
    const app = createApp({
      logging: false,
      counselor: {
        sendMessage: { execute },
        resolveUserId: () => Promise.resolve(userId),
      },
    });

    const response = await request(app)
      .post(`/api/v1/conversations/${counselorFixtureIds.conversationId}/messages`)
      .set("Authorization", "Bearer synthetic-token")
      .send(validSendConversationMessageRequest);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("event: assistant_turn");
    expect(response.text).toContain(`"turnId":"${validAssistantTurn.turnId}"`);
    expect(response.text).toContain("event: done");
    expect(execute).toHaveBeenCalledWith({
      userId,
      conversationId: counselorFixtureIds.conversationId,
      request: validSendConversationMessageRequest,
    });
  });

  it("rejects an unauthenticated request", async () => {
    const execute = vi.fn(() => Promise.resolve(validAssistantTurn));
    const app = createApp({
      logging: false,
      counselor: {
        sendMessage: { execute },
        resolveUserId: () => Promise.resolve(null),
      },
    });

    const response = await request(app)
      .post(`/api/v1/conversations/${counselorFixtureIds.conversationId}/messages`)
      .send(validSendConversationMessageRequest);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "authentication_required" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects an invalid request before invoking the service", async () => {
    const execute = vi.fn(() => Promise.resolve(validAssistantTurn));
    const app = createApp({
      logging: false,
      counselor: {
        sendMessage: { execute },
        resolveUserId: () => Promise.resolve(userId),
      },
    });

    const response = await request(app)
      .post(`/api/v1/conversations/${counselorFixtureIds.conversationId}/messages`)
      .send({ ...validSendConversationMessageRequest, content: "" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "invalid_request" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns service unavailable until runtime dependencies are connected", async () => {
    const response = await request(createApp({ logging: false }))
      .post(`/api/v1/conversations/${counselorFixtureIds.conversationId}/messages`)
      .send(validSendConversationMessageRequest);

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "counselor_unavailable" });
  });

  it("publishes the endpoint in OpenAPI", async () => {
    const response = await request(createApp({ logging: false })).get("/openapi.json");
    const body = OpenApiPathsSchema.parse(response.body);

    expect(
      ConversationMessagesPathSchema.safeParse(
        body.paths["/api/v1/conversations/{conversationId}/messages"],
      ).success,
    ).toBe(true);
  });
});
