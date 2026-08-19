import type { SafetyTier } from "@yuvanext/contracts";

export const SAFETY_POLICY_VERSION = "mock-safety-md-v1";
export const SAFETY_RULE_SET_VERSION = "mock-safety-md-rules-v1";
export const SAFETY_SOURCE_DOCUMENT_REF = "docs/reference/SAFETY.md";

export type ApprovedSafetyMessage = {
  key: string;
  version: string;
  tier: SafetyTier;
  language: "en";
  content: string;
};

export type SafetyClassifierRule = {
  id: string;
  tier: SafetyTier;
  approvedMessageKey: string;
  keywords: readonly string[];
  pauseJourney: boolean;
  createHandoff: boolean;
};

export const approvedSafetyMessages = [
  {
    key: "mock_safety.tier_1",
    version: SAFETY_POLICY_VERSION,
    tier: "tier_1",
    language: "en",
    content:
      "Mock SAFETY.md Tier 1 response. Pause the journey, show the approved urgent support copy, and alert staff immediately. Not signed for production launch.",
  },
  {
    key: "mock_safety.tier_2",
    version: SAFETY_POLICY_VERSION,
    tier: "tier_2",
    language: "en",
    content:
      "Mock SAFETY.md Tier 2 response. Pause the journey, show the approved support copy, and create a staff handoff. Not signed for production launch.",
  },
  {
    key: "mock_safety.tier_3",
    version: SAFETY_POLICY_VERSION,
    tier: "tier_3",
    language: "en",
    content:
      "Mock SAFETY.md Tier 3 response. Keep the journey available, show the approved gentle support copy, and do not create an automatic handoff. Not signed for production launch.",
  },
] as const satisfies readonly ApprovedSafetyMessage[];

export const safetyClassifierRules = [
  {
    id: "mock_tier_1_immediate_risk",
    tier: "tier_1",
    approvedMessageKey: "mock_safety.tier_1",
    keywords: [
      "immediate danger",
      "immediate",
      "danger",
      "right now danger",
      "emergency",
      "urgent",
      "urgency",
      "urgent help",
      "help me now",
      "not safe right now",
      "someone is attacking me",
      "someone is following me",
      "someone is trying to hurt me",
      "die",
      "i might die",
      "kill myself",
      "about to hurt myself",
      "kill myself now",
      "suicide",
      "suicide now",
      "hurt myself now",
      "end my life now",
      "i have a weapon",
      "took pills",
      "overdose",
    ],
    pauseJourney: true,
    createHandoff: true,
  },
  {
    id: "mock_tier_2_handoff_required",
    tier: "tier_2",
    approvedMessageKey: "mock_safety.tier_2",
    keywords: [
      "self harm",
      "self-harm",
      "cut myself",
      "want to disappear",
      "end my life",
      "kill myself",
      "no reason to live",
      "planning suicide",
      "suicide",
      "hurt myself",
      "harm myself",
      "harm me",
      "being abused",
      "abuse at home",
      "forced to do something",
      "touched me",
      "molested",
      "blackmailing me",
      "threatened",
      "threatening me",
      "beat me",
      "hit me",
      "violence at home",
      "domestic violence",
      "sexual abuse",
      "assaulted",
    ],
    pauseJourney: true,
    createHandoff: true,
  },
  {
    id: "mock_tier_3_supportive_response",
    tier: "tier_3",
    approvedMessageKey: "mock_safety.tier_3",
    keywords: [
      "panic",
      "panic attack",
      "anxious",
      "anxiety",
      "overwhelmed",
      "hopeless",
      "worthless",
      "crying",
      "depressed",
      "lonely",
      "bullying",
      "bullied",
      "harassed",
      "unsafe",
      "very scared",
      "scared to go home",
      "cannot cope",
      "can't cope",
      "too much pressure",
      "everyone hates me",
    ],
    pauseJourney: false,
    createHandoff: false,
  },
] as const satisfies readonly SafetyClassifierRule[];

export function getApprovedSafetyMessage(messageKey: string): ApprovedSafetyMessage | undefined {
  return approvedSafetyMessages.find((message) => message.key === messageKey);
}

export const SYNTHETIC_POLICY_VERSION = SAFETY_POLICY_VERSION;
export const SYNTHETIC_RULE_SET_VERSION = SAFETY_RULE_SET_VERSION;
export const syntheticSafetyRules = safetyClassifierRules;
