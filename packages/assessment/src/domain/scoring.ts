import { createHash } from "node:crypto";
import type { AssessmentResult, InstrumentCode, RiasecScale, WorkValueScale } from "@yuvanext/contracts";

export type ScoredResponseInput = {
  itemId: string;
  scaleCode: string | null;
  isQc: boolean;
  responseValue: number | null;
  scoreDelta: number | null;
};

const RIASEC_ORDER: RiasecScale[] = ["R", "I", "A", "S", "E", "C"];
const WORK_VALUE_ORDER: WorkValueScale[] = [
  "achievement",
  "independence",
  "recognition",
  "relationships",
  "support",
  "working_conditions",
];

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
}): AssessmentResult => scoreAssessmentResponses(input);

export const scoreAssessmentResponses = (input: {
  runId: string;
  userId: string;
  instrumentCode: AssessmentResult["instrumentCode"];
  instrumentVersion: string;
  algorithmVersion: string;
  responses: ScoredResponseInput[];
  resultId: string;
  createdAt: string;
}): AssessmentResult => {
  const scaleOrder = getScaleOrder(input.instrumentCode);
  const rawScores = Object.fromEntries(scaleOrder.map((scale) => [scale, 0])) as Record<string, number>;
  let qcAnswered = 0;

  for (const response of input.responses) {
    if (response.isQc) {
      qcAnswered += 1;
      continue;
    }
    if (!response.scaleCode || !scaleOrder.includes(response.scaleCode)) {
      continue;
    }

    const score = response.scoreDelta ?? response.responseValue ?? 0;
    rawScores[response.scaleCode] = getScore(rawScores, response.scaleCode) + score;
  }

  const maxScore = Math.max(...Object.values(rawScores), 1);
  const normalizedScores = Object.fromEntries(
    scaleOrder.map((scale) => [scale, Number((getScore(rawScores, scale) / maxScore).toFixed(6))]),
  ) as Record<string, number>;

  const sorted = [...scaleOrder].sort((left, right) => {
    const scoreDelta = getScore(rawScores, right) - getScore(rawScores, left);
    return scoreDelta === 0 ? scaleOrder.indexOf(left) - scaleOrder.indexOf(right) : scoreDelta;
  });
  const thirdScore = getScore(rawScores, sorted[2] ?? scaleOrder[scaleOrder.length - 1] ?? "");
  const fourthScore = getScore(rawScores, sorted[3] ?? scaleOrder[scaleOrder.length - 1] ?? "");
  const closeScores = thirdScore - fourthScore <= 1;
  const resultCode = input.instrumentCode === "wip" ? sorted.slice(0, 2).join("_") : sorted.slice(0, 3).join("");
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

const getScaleOrder = (instrumentCode: InstrumentCode): string[] =>
  instrumentCode === "wip" ? WORK_VALUE_ORDER : RIASEC_ORDER;

const getScore = (scores: Record<string, number>, scale: string): number => scores[scale] ?? 0;
