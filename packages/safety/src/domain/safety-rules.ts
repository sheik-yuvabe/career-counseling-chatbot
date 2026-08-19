import type { ResolvedSafetyCheckRequest, SafetyDecision } from "@yuvanext/contracts";
import {
  SAFETY_POLICY_VERSION,
  getApprovedSafetyMessage,
  safetyClassifierRules,
} from "./safety-policy.js";

const tierPriority = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
} as const;

const normalizeForSafetyMatch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function evaluateSafetyCheck(request: ResolvedSafetyCheckRequest): SafetyDecision {
  const normalizedMessage = normalizeForSafetyMatch(request.message);
  const matchingRule = safetyClassifierRules
    .filter((rule) =>
      rule.keywords.some((keyword) => normalizedMessage.includes(normalizeForSafetyMatch(keyword))),
    )
    .sort((left, right) => tierPriority[left.tier] - tierPriority[right.tier])[0];

  if (!matchingRule) {
    return {
      decisionId: request.sourceEventId,
      triggered: false,
      pauseJourney: false,
      createHandoff: false,
    };
  }

  const approvedMessage = getApprovedSafetyMessage(matchingRule.approvedMessageKey);

  if (!approvedMessage) {
    throw new Error(`Missing approved safety message: ${matchingRule.approvedMessageKey}`);
  }

  return {
    decisionId: request.sourceEventId,
    triggered: true,
    tier: matchingRule.tier,
    approvedMessageKey: approvedMessage.key,
    approvedMessageVersion: SAFETY_POLICY_VERSION,
    pauseJourney: matchingRule.pauseJourney,
    createHandoff: matchingRule.createHandoff,
  };
}

export const evaluateSyntheticSafetyCheck = evaluateSafetyCheck;
