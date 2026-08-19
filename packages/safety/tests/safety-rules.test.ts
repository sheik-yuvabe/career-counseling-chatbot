import { describe, expect, it } from "vitest";
import { SafetyDecisionSchema, type ResolvedSafetyCheckRequest } from "@yuvanext/contracts";
import {
  SAFETY_POLICY_VERSION,
  approvedSafetyMessages,
  evaluateSafetyCheck,
  getApprovedSafetyMessage,
  safetyClassifierRules,
} from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-28T10:00:00.000Z";

function buildRequest(message: string): ResolvedSafetyCheckRequest {
  return {
    sourceEventId: uuid,
    triggerType: "message",
    message,
    occurredAt: timestamp,
    context: {
      userId: uuid,
      sessionId: uuid,
      segment: "explorer",
      language: "en",
    },
  };
}

describe("mock SAFETY.md classifier rules", () => {
  it.each([
    ["I am in immediate danger", "tier_1", "mock_safety.tier_1", true, true],
    ["I am thinking about self harm", "tier_2", "mock_safety.tier_2", true, true],
    ["I feel overwhelmed by everything", "tier_3", "mock_safety.tier_3", false, false],
  ] as const)(
    "maps a matching message to %s and approved copy",
    (message, expectedTier, expectedMessageKey, pauseJourney, createHandoff) => {
      const decision = evaluateSafetyCheck(buildRequest(message));

      expect(SafetyDecisionSchema.parse(decision)).toEqual({
        decisionId: uuid,
        triggered: true,
        tier: expectedTier,
        approvedMessageKey: expectedMessageKey,
        approvedMessageVersion: SAFETY_POLICY_VERSION,
        pauseJourney,
        createHandoff,
      });
      expect(getApprovedSafetyMessage(expectedMessageKey)?.content).toContain("Mock SAFETY.md");
    },
  );

  it("chooses the highest-priority tier when multiple rules match", () => {
    const decision = evaluateSafetyCheck(
      buildRequest("I feel overwhelmed and I am in immediate danger"),
    );

    expect(decision.tier).toBe("tier_1");
    expect(decision.approvedMessageKey).toBe("mock_safety.tier_1");
  });

  it.each([
    ["Someone is trying to hurt me and I need urgent help", "tier_1"],
    ["I want to kill myself", "tier_1"],
    ["I am thinking about suicide", "tier_1"],
    ["I have no reason to live and I might harm myself", "tier_2"],
    ["I am being blackmailed and threatened", "tier_2"],
    ["I am anxious, bullied, and cannot cope", "tier_3"],
  ] as const)("classifies broader mock safety language as %s", (message, expectedTier) => {
    const decision = evaluateSafetyCheck(buildRequest(message));

    expect(decision.triggered).toBe(true);
    expect(decision.tier).toBe(expectedTier);
  });

  it("does not trigger for normal career questions", () => {
    const decision = evaluateSafetyCheck(
      buildRequest("Which careers match biology and design after class 12?"),
    );

    expect(SafetyDecisionSchema.parse(decision)).toEqual({
      decisionId: uuid,
      triggered: false,
      pauseJourney: false,
      createHandoff: false,
    });
  });

  it("does not trigger for rude language without a safety-risk phrase", () => {
    const decision = evaluateSafetyCheck(
      buildRequest("This app is stupid and I hate these recommendations."),
    );

    expect(SafetyDecisionSchema.parse(decision)).toEqual({
      decisionId: uuid,
      triggered: false,
      pauseJourney: false,
      createHandoff: false,
    });
  });

  it("keeps every classifier rule connected to exact approved copy", () => {
    for (const rule of safetyClassifierRules) {
      const approvedMessage = getApprovedSafetyMessage(rule.approvedMessageKey);

      expect(approvedMessage).toBeDefined();
      expect(approvedMessage?.tier).toBe(rule.tier);
      expect(approvedMessage?.version).toBe(SAFETY_POLICY_VERSION);
    }
  });

  it("marks every approved message as mock copy", () => {
    for (const message of approvedSafetyMessages) {
      expect(message.version).toBe(SAFETY_POLICY_VERSION);
      expect(message.content).toContain("Not signed for production launch.");
    }
  });
});
