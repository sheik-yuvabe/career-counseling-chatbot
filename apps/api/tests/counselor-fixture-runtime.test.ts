import {
  counselorFixtureIds,
  validCreateJourneyEventRequest,
  validSendConversationMessageRequest,
  validStartConversationRequest,
  validProfileSnapshot,
} from "@yuvanext/test-fixtures";
import {
  ConversationHistoryResponseSchema,
  CreateJourneyEventResponseSchema,
  ExplorationEventResponseSchema,
  GeneratedAssetResponseSchema,
  JourneyResponseSchema,
  ReportResponseSchema,
  StartConversationResponseSchema,
} from "@yuvanext/contracts";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/create-app.js";
import { createCounselorFixtureRuntime } from "../src/app/create-counselor-fixture-runtime.js";

const fixtureToken = "synthetic-test-token";

describe("counselor fixture runtime", () => {
  it("runs the authenticated start and send workflow without Supabase", async () => {
    const app = createApp({
      logging: false,
      databaseRequired: false,
      counselor: createCounselorFixtureRuntime(fixtureToken),
    });

    const missingJourney = await request(app)
      .get("/api/v1/journey")
      .set("Authorization", `Bearer ${fixtureToken}`);
    expect(missingJourney.status).toBe(404);
    expect(missingJourney.body).toMatchObject({ code: "journey_not_found" });

    const started = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(validStartConversationRequest);
    const retry = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(validStartConversationRequest);

    expect(started.status).toBe(200);
    const startedBody = StartConversationResponseSchema.parse(started.body as unknown);
    expect(StartConversationResponseSchema.parse(retry.body as unknown)).toEqual(startedBody);
    const conversationId = startedBody.conversation.conversationId;
    const journeyResponse = await request(app)
      .get("/api/v1/journey")
      .set("Authorization", `Bearer ${fixtureToken}`);
    const journey = JourneyResponseSchema.parse(journeyResponse.body as unknown);
    expect(journeyResponse.status).toBe(200);
    expect(journey.journey.conversationId).toBe(conversationId);
    expect(journey.journey.currentStateKey).toBe("synthetic_welcome");

    const journeyEventRequest = {
      ...validCreateJourneyEventRequest,
      idempotencyKey: "00000000-0000-4000-8000-000000000471",
    };
    const eventResponse = await request(app)
      .post("/api/v1/journey/events")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(journeyEventRequest);
    const eventRetry = await request(app)
      .post("/api/v1/journey/events")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(journeyEventRequest);
    const eventResult = CreateJourneyEventResponseSchema.parse(eventResponse.body as unknown);

    expect(eventResponse.status).toBe(200);
    expect(CreateJourneyEventResponseSchema.parse(eventRetry.body as unknown)).toEqual(eventResult);
    expect(eventResult.journey.lockVersion).toBe(1);
    expect(eventResult.event.conversationId).toBe(conversationId);
    expect(eventResult.event.eventSchemaVersion).toBe(1);
    expect(eventResult.event.relatedEntityType).toBeNull();

    const explorationRequest = {
      conversationId,
      recommendationId: counselorFixtureIds.recommendationId,
      recommendationItemId: counselorFixtureIds.recommendationItemId,
      action: "viewed",
      clientEventId: counselorFixtureIds.clientExplorationEventId,
    };
    const explored = await request(app)
      .post("/api/v1/exploration/events")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(explorationRequest);
    const explorationRetry = await request(app)
      .post("/api/v1/exploration/events")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(explorationRequest);
    const exploration = ExplorationEventResponseSchema.parse(explored.body as unknown);

    expect(explored.status).toBe(200);
    expect(ExplorationEventResponseSchema.parse(explorationRetry.body as unknown)).toEqual(
      exploration,
    );

    const reportRequest = {
      profileSnapshotId: validProfileSnapshot.snapshotId,
      idempotencyKey: "00000000-0000-4000-8000-000000000474",
    };
    const createdReport = await request(app)
      .post("/api/v1/reports")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(reportRequest);
    const reportRetry = await request(app)
      .post("/api/v1/reports")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(reportRequest);
    const report = ReportResponseSchema.parse(createdReport.body as unknown);

    expect(createdReport.status).toBe(200);
    expect(ReportResponseSchema.parse(reportRetry.body as unknown)).toEqual(report);
    expect(report.report.exploredEntityIds).toEqual([counselorFixtureIds.entityId]);
    expect(report.report.payload).toMatchObject({
      schemaVersion: 1,
      profile: { snapshotId: validProfileSnapshot.snapshotId },
    });

    const loadedReport = await request(app)
      .get(`/api/v1/reports/${report.report.reportId}`)
      .set("Authorization", `Bearer ${fixtureToken}`);
    expect(ReportResponseSchema.parse(loadedReport.body as unknown)).toEqual(report);

    const pdfRequest = { idempotencyKey: "00000000-0000-4000-8000-000000000475" };
    const pdf = await request(app)
      .post(`/api/v1/reports/${report.report.reportId}/pdf`)
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(pdfRequest);
    const pdfRetry = await request(app)
      .post(`/api/v1/reports/${report.report.reportId}/pdf`)
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send(pdfRequest);
    const pdfAsset = GeneratedAssetResponseSchema.parse(pdf.body as unknown);
    expect(pdf.status).toBe(200);
    expect(GeneratedAssetResponseSchema.parse(pdfRetry.body as unknown)).toEqual(pdfAsset);
    expect(pdfAsset.asset.privacyClass).toBe("private_report");

    const share = await request(app)
      .post("/api/v1/share-cards")
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send({
        reportId: report.report.reportId,
        idempotencyKey: "00000000-0000-4000-8000-000000000476",
      });
    const shareAsset = GeneratedAssetResponseSchema.parse(share.body as unknown);
    expect(share.status).toBe(200);
    expect(shareAsset.asset.privacyClass).toBe("share_safe");

    const sent = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${fixtureToken}`)
      .send({
        ...validSendConversationMessageRequest,
        idempotencyKey: "00000000-0000-4000-8000-000000000421",
      });

    expect(sent.status).toBe(200);
    expect(sent.headers["content-type"]).toContain("text/event-stream");
    expect(sent.text).toContain("event: assistant_turn");
    expect(sent.text).toContain("Your synthetic recommendation is ready to explore.");
    expect(sent.text).toContain("event: done");

    const historyResponse = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${fixtureToken}`);
    const history = ConversationHistoryResponseSchema.parse(historyResponse.body as unknown);

    expect(historyResponse.status).toBe(200);
    expect(history.conversation.conversationId).toBe(conversationId);
    expect(history.messages.map((message) => message.turnNumber)).toEqual([1, 2, 3]);
    expect(history.messages.map((message) => message.role)).toEqual([
      "system_copy",
      "user",
      "assistant",
    ]);
  });

  it("requires the configured synthetic bearer token", async () => {
    const app = createApp({
      logging: false,
      databaseRequired: false,
      counselor: createCounselorFixtureRuntime(fixtureToken),
    });

    const response = await request(app)
      .post("/api/v1/conversations")
      .set("Authorization", "Bearer wrong-token")
      .send(validStartConversationRequest);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "authentication_required" });
  });
});
