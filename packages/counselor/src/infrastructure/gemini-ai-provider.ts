import { z } from "zod";
import type { AiProvider, AiProviderRequest, AiProviderResult } from "../application/index.js";
import {
  buildCounselorPrompt,
  counselorDraftJsonSchema,
  counselorSystemPrompt,
  parseAiProviderDraft,
} from "./ai-provider-shared.js";

const GeminiResponseSchema = z
  .object({
    candidates: z
      .array(
        z
          .object({
            content: z
              .object({
                parts: z.array(
                  z
                    .object({
                      text: z.string().optional(),
                    })
                    .passthrough(),
                ),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

type Fetch = typeof fetch;

export type GeminiAiProviderOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  endpoint?: string;
  fetch?: Fetch;
};

const normalizeModel = (model: string): string => model.replace(/^models\//, "");

export class GeminiAiProvider implements AiProvider {
  private readonly fetch: Fetch;
  private readonly endpoint: string;

  constructor(private readonly options: GeminiAiProviderOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.endpoint =
      options.endpoint ??
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalizeModel(options.model))}:generateContent`;
  }

  async generateDraft(input: AiProviderRequest): Promise<AiProviderResult> {
    try {
      const response = await this.fetch(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.options.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: counselorSystemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildCounselorPrompt(input) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: this.options.maxTokens,
            responseMimeType: "application/json",
            responseJsonSchema: counselorDraftJsonSchema,
            ...(this.options.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: this.options.thinkingLevel } }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      if (!response.ok) {
        return {
          status: "failed",
          errorCode: response.status === 429 ? "rate_limited" : `provider_http_${response.status}`,
        };
      }

      const payload = GeminiResponseSchema.parse(await response.json());
      const text = (payload.candidates ?? [])
        .flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();
      return text
        ? parseAiProviderDraft(text)
        : { status: "failed", errorCode: "empty_provider_output" };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        return { status: "timed_out", errorCode: "provider_timeout" };
      }
      return { status: "failed", errorCode: "provider_request_failed" };
    }
  }
}
