import { z } from "zod";
import type { AiProviderRequest, AiProviderResult } from "../application/index.js";

const DraftSchema = z
  .object({
    text: z.string().trim().min(1),
    grounding: z
      .object({
        entityIds: z.array(z.string().uuid()),
        recommendationIds: z.array(z.string().uuid()),
      })
      .strict(),
  })
  .strict();

export const counselorSystemPrompt = `You are the YuvaNext career counselor. Use only facts in the supplied profile, recommendation, and groundingEvidence JSON. Never calculate or change scores, ranks, rings, eligibility, URLs, or entities. Do not provide safety or crisis advice. Return only a JSON object with this exact shape: {"text":"...","grounding":{"entityIds":["uuid"],"recommendationIds":["uuid"]}}. Include an ID only when the response actually relies on it. Do not wrap JSON in markdown.`;

export const counselorDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    grounding: {
      type: "object",
      additionalProperties: false,
      properties: {
        entityIds: { type: "array", items: { type: "string", format: "uuid" } },
        recommendationIds: { type: "array", items: { type: "string", format: "uuid" } },
      },
      required: ["entityIds", "recommendationIds"],
    },
  },
  required: ["text", "grounding"],
} as const;

export const buildCounselorPrompt = (input: AiProviderRequest): string =>
  JSON.stringify({
    request: input.userMessage,
    profile: input.profile,
    recommendation: input.recommendation,
    groundingEvidence: input.groundingEvidence,
    recentMessages: input.recentMessages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    groundingViolations: input.groundingViolations,
  });

export const parseAiProviderDraft = (text: string): AiProviderResult => {
  const normalized = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const draft = DraftSchema.parse(JSON.parse(normalized) as unknown);
    return { status: "completed", ...draft };
  } catch {
    return { status: "failed", errorCode: "invalid_provider_output" };
  }
};
