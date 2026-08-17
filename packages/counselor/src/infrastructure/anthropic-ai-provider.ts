import { z } from "zod";
import type { AiProvider, AiProviderRequest, AiProviderResult } from "../application/index.js";
import {
  buildCounselorPrompt,
  counselorSystemPrompt,
  parseAiProviderDraft,
} from "./ai-provider-shared.js";

const AnthropicResponseSchema = z
  .object({
    content: z.array(
      z
        .object({
          type: z.string(),
          text: z.string().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

type Fetch = typeof fetch;

export type AnthropicAiProviderOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  endpoint?: string;
  fetch?: Fetch;
};

export class AnthropicAiProvider implements AiProvider {
  private readonly fetch: Fetch;
  private readonly endpoint: string;

  constructor(private readonly options: AnthropicAiProviderOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.endpoint = options.endpoint ?? "https://api.anthropic.com/v1/messages";
  }

  async generateDraft(input: AiProviderRequest): Promise<AiProviderResult> {
    try {
      const response = await this.fetch(this.endpoint, {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": this.options.apiKey,
        },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: this.options.maxTokens,
          temperature: 0,
          system: counselorSystemPrompt,
          messages: [
            {
              role: "user",
              content: buildCounselorPrompt(input),
            },
          ],
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      if (!response.ok) {
        return {
          status: "failed",
          errorCode: response.status === 429 ? "rate_limited" : `provider_http_${response.status}`,
        };
      }
      const payload = AnthropicResponseSchema.parse(await response.json());
      const text = payload.content
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
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

export class DisabledAiProvider implements AiProvider {
  generateDraft(input: AiProviderRequest): Promise<AiProviderResult> {
    void input;
    return Promise.resolve({ status: "disabled" });
  }
}
