import {
  validProfileSnapshot,
  validRecommendationSet,
  validRetrievedEvidence,
} from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { AnthropicAiProvider } from "../src/index.js";

const request = {
  conversationId: "00000000-0000-4000-8000-000000000401",
  userMessage: "Explain my recommendation.",
  profile: validProfileSnapshot,
  recommendation: validRecommendationSet,
  groundingEvidence: [validRetrievedEvidence],
  recentMessages: [],
  groundingViolations: [],
};

const createProvider = (fetch: typeof globalThis.fetch) =>
  new AnthropicAiProvider({
    apiKey: "synthetic-api-key",
    model: "synthetic-model",
    maxTokens: 300,
    timeoutMs: 1_000,
    fetch,
  });

describe("AnthropicAiProvider", () => {
  it("maps a contract-valid JSON response without exposing the API key in the body", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  text: "Your saved recommendation is ready.",
                  grounding: {
                    entityIds: [validRecommendationSet.items[0]?.entityId],
                    recommendationIds: [validRecommendationSet.recommendationId],
                  },
                }),
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    ) as unknown as typeof globalThis.fetch;

    await expect(createProvider(fetch).generateDraft(request)).resolves.toEqual({
      status: "completed",
      text: "Your saved recommendation is ready.",
      grounding: {
        entityIds: [validRecommendationSet.items[0]?.entityId],
        recommendationIds: [validRecommendationSet.recommendationId],
      },
    });
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(typeof init?.body).toBe("string");
    expect(init?.body).not.toContain("synthetic-api-key");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("synthetic-api-key");
  });

  it("rejects malformed model output and maps rate limiting", async () => {
    const malformedFetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ content: [{ type: "text", text: "not-json" }] }), {
          status: 200,
        }),
      ),
    ) as unknown as typeof globalThis.fetch;
    const limitedFetch = vi.fn(() =>
      Promise.resolve(new Response("limited", { status: 429 })),
    ) as unknown as typeof globalThis.fetch;

    await expect(createProvider(malformedFetch).generateDraft(request)).resolves.toEqual({
      status: "failed",
      errorCode: "invalid_provider_output",
    });
    await expect(createProvider(limitedFetch).generateDraft(request)).resolves.toEqual({
      status: "failed",
      errorCode: "rate_limited",
    });
  });
});
