import {
  validProfileSnapshot,
  validRecommendationSet,
  validRetrievedEvidence,
} from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { GeminiAiProvider } from "../src/index.js";

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
  new GeminiAiProvider({
    apiKey: "synthetic-gemini-key",
    model: "models/gemini-test",
    maxTokens: 300,
    timeoutMs: 1_000,
    thinkingLevel: "minimal",
    fetch,
  });

describe("GeminiAiProvider", () => {
  it("maps structured output and keeps the API key out of the URL and body", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        text: "Your saved recommendation is ready.",
                        grounding: {
                          entityIds: [validRecommendationSet.items[0]?.entityId],
                          recommendationIds: [validRecommendationSet.recommendationId],
                        },
                      }),
                    },
                  ],
                },
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

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    if (typeof url !== "string" || typeof init?.body !== "string") {
      throw new Error("Expected Gemini request URL and body to be strings");
    }
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
    );
    expect(url).not.toContain("synthetic-gemini-key");
    expect(init?.body).not.toContain("synthetic-gemini-key");
    expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("synthetic-gemini-key");

    const body = JSON.parse(init.body) as {
      generationConfig?: {
        responseMimeType?: string;
        responseJsonSchema?: unknown;
        thinkingConfig?: { thinkingLevel?: string };
      };
    };
    expect(body.generationConfig?.responseMimeType).toBe("application/json");
    expect(body.generationConfig?.responseJsonSchema).toBeDefined();
    expect(body.generationConfig?.thinkingConfig?.thinkingLevel).toBe("minimal");
  });

  it("rejects malformed output and maps rate limiting", async () => {
    const malformedFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }),
          { status: 200 },
        ),
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
