import { createHash } from "node:crypto";
import type { AssessmentResult, RiasecScale } from "@yuvanext/contracts";

export type ScoredResponseInput = {
  itemId: string;
  scaleCode: string | null;
  isQc: boolean;
  responseValue: number | null;
  scoreDelta: number | null;
};

const RIASEC_ORDER: RiasecScale[] = ["R", "I", "A", "S", "E", "C"];

const stableJson = (value: unknown): string => JSON.stringify(value, Object.keys(value as object).sort());

export const sha256Json = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const scoreRiasecResponses = (input: {
  runId: string;
  userId: string;
  instrumentCode: AssessmentResult["instrumentCode"];
  instrumentVersion: string;
  algorithmVersion: string;
  responses: ScoredResponseInput[];
  resultId: string;
  createdAt: string;
}): AssessmentResult => {
  const rawScores: Record<RiasecScale, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  let qcAnswered = 0;

  for (const response of input.responses) {
    if (response.isQc) {
      qcAnswered += 1;
      continue;
    }
    if (!response.scaleCode || !RIASEC_ORDER.includes(response.scaleCode as RiasecScale)) {
      continue;
    }

    const score = response.scoreDelta ?? response.responseValue ?? 0;
    rawScores[response.scaleCode as RiasecScale] += score;
  }

  const maxScore = Math.max(...Object.values(rawScores), 1);
  const normalizedScores = Object.fromEntries(
    RIASEC_ORDER.map((scale) => [scale, Number((rawScores[scale] / maxScore).toFixed(6))]),
  ) as Record<RiasecScale, number>;

  const sorted = [...RIASEC_ORDER].sort((left, right) => {
    const scoreDelta = rawScores[right] - rawScores[left];
    return scoreDelta === 0 ? RIASEC_ORDER.indexOf(left) - RIASEC_ORDER.indexOf(right) : scoreDelta;
  });
  const closeScores = rawScores[sorted[2] ?? "C"] - rawScores[sorted[3] ?? "C"] <= 1;
  const resultCode = sorted.slice(0, 3).join("");
  const qcSummary = { qcAnswered, scoredResponses: input.responses.length - qcAnswered };
  const resultPayload = {
    rawScores,
    normalizedScores,
    resultCode,
    confidence: closeScores ? "soft" : "normal",
    closeScores,
    qcSummary,
  };

  return {
    id: input.resultId,
    assessmentRunId: input.runId,
    userId: input.userId,
    instrumentCode: input.instrumentCode,
    instrumentVersion: input.instrumentVersion,
    algorithmVersion: input.algorithmVersion,
    rawScores,
    normalizedScores,
    resultCode,
    confidence: closeScores ? "soft" : "normal",
    closeScores,
    qcSummary,
    inputHash: sha256Json(input.responses),
    outputHash: createHash("sha256").update(stableJson(resultPayload)).digest("hex"),
    createdAt: input.createdAt,
  };
};
