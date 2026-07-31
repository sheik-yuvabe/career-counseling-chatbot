import { describe, expect, it } from "vitest";
import { scoreRiasecResponses } from "./scoring.js";

describe("scoreRiasecResponses", () => {
  it("produces deterministic RIASEC code with fixed tie fallback order", () => {
    const result = scoreRiasecResponses({
      runId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      instrumentCode: "mini_ip_30",
      instrumentVersion: "1.0",
      algorithmVersion: "riasec-score-v1",
      resultId: "33333333-3333-4333-8333-333333333333",
      createdAt: "2026-07-30T09:00:00.000Z",
      responses: [
        { itemId: "r1", scaleCode: "R", isQc: false, responseValue: 5, scoreDelta: null },
        { itemId: "i1", scaleCode: "I", isQc: false, responseValue: 5, scoreDelta: null },
        { itemId: "a1", scaleCode: "A", isQc: false, responseValue: 4, scoreDelta: null },
        { itemId: "s1", scaleCode: "S", isQc: false, responseValue: 4, scoreDelta: null },
        { itemId: "qc1", scaleCode: null, isQc: true, responseValue: 1, scoreDelta: null },
      ],
    });

    expect(result.resultCode).toBe("RIA");
    expect(result.confidence).toBe("soft");
    expect(result.rawScores).toEqual({ R: 5, I: 5, A: 4, S: 4, E: 0, C: 0 });
    expect(result.inputHash).toHaveLength(64);
    expect(result.outputHash).toHaveLength(64);
  });
});
