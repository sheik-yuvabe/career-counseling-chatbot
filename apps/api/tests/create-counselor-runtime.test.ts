import {
  FixtureAiProvider,
  FixtureApprovedCopyReader,
  FixtureKnowledgeReader,
  FixtureProfileReader,
  FixtureRecommendationReader,
  FixtureReportRenderer,
  FixtureSafetyChecker,
  SendConversationMessageService,
  StartConversationService,
} from "@yuvanext/counselor";
import {
  validHandoffPacket,
  validProfileSnapshot,
  validRecommendationSet,
  validRetrievedEvidence,
  validSafetyDecision,
} from "@yuvanext/test-fixtures";
import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  createCounselorRuntime,
  type CounselorRuntimeAdapters,
} from "../src/app/create-counselor-runtime.js";

describe("createCounselorRuntime", () => {
  it("composes PostgreSQL-backed services and Supabase authentication", async () => {
    const databasePool = {
      query: vi.fn(),
    } as unknown as CounselorRuntimeAdapters["databasePool"];
    const runtime = createCounselorRuntime({
      databasePool,
      supabaseAuth: {
        auth: {
          getUser: () =>
            Promise.resolve({
              data: { user: { id: validProfileSnapshot.userId } },
              error: null,
            }),
        },
      },
      profiles: new FixtureProfileReader([validProfileSnapshot]),
      recommendations: new FixtureRecommendationReader([validRecommendationSet]),
      knowledge: new FixtureKnowledgeReader(validRetrievedEvidence),
      safety: new FixtureSafetyChecker(validSafetyDecision, validHandoffPacket),
      ai: new FixtureAiProvider({ status: "disabled" }),
      approvedCopy: new FixtureApprovedCopyReader([
        {
          segment: "pathfinder",
          language: "en",
          key: "welcome",
          version: "1",
          text: "Synthetic approved welcome.",
        },
        {
          segment: "pathfinder",
          language: "en",
          key: "counselor_unavailable",
          version: "1",
          text: "Synthetic approved fallback.",
        },
      ]),
      reportRenderer: new FixtureReportRenderer(),
      privateAssetTtlMs: 15 * 60 * 1000,
      shareAssetTtlMs: 24 * 60 * 60 * 1000,
      aiMode: "disabled",
    });

    expect(runtime.startConversation).toBeInstanceOf(StartConversationService);
    expect(runtime.sendMessage).toBeInstanceOf(SendConversationMessageService);
    const request = {
      header: () => "Bearer synthetic-token",
    } as unknown as Request;
    await expect(runtime.resolveUserId(request)).resolves.toBe(validProfileSnapshot.userId);
  });
});
