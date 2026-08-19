import { validHandoffPacket, validSafetyDecision } from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { CounselorDependencyUnavailableError, HttpSafetyChecker } from "../src/index.js";

const options = (fetch: typeof globalThis.fetch) => ({
  baseUrl: "https://safety.example.test",
  timeoutMs: 1_000,
  fetch,
});

describe("HttpSafetyChecker", () => {
  it("calls the typed safety and handoff boundaries", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ decision: validSafetyDecision }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ packet: validHandoffPacket }), { status: 201 }),
      ) as unknown as typeof globalThis.fetch;
    const checker = new HttpSafetyChecker(options(fetch));

    await expect(
      checker.preCheck({
        userId: "00000000-0000-4000-8000-000000000400",
        sessionId: "00000000-0000-4000-8000-000000000402",
        conversationId: "00000000-0000-4000-8000-000000000401",
        sourceEventId: "00000000-0000-4000-8000-000000000403",
        content: "Synthetic message",
        occurredAt: "2026-08-11T05:00:00.000Z",
        profileSnapshotId: "00000000-0000-4000-8000-000000000406",
        segment: "pathfinder",
        language: "en",
      }),
    ).resolves.toEqual(validSafetyDecision);
    await expect(
      checker.requestHandoff({
        idempotencyKey: "00000000-0000-4000-8000-000000000404",
        sourceEventId: "00000000-0000-4000-8000-000000000403",
        userId: "00000000-0000-4000-8000-000000000400",
        reason: "tier_2",
        user: validHandoffPacket.user,
        profile: validHandoffPacket.profile,
        trigger: {
          occurredAt: validHandoffPacket.trigger.occurredAt,
          excerpt: validHandoffPacket.trigger.excerpt,
        },
        lastTurns: validHandoffPacket.lastTurns ?? [],
        planState: validHandoffPacket.planState ?? {},
        consentedContactAvailable: validHandoffPacket.consentedContactAvailable,
        requestCorrelationId: "00000000-0000-4000-8000-000000000405",
      }),
    ).resolves.toEqual(validHandoffPacket);
    expect((vi.mocked(fetch).mock.calls[0]?.[0] as URL).pathname).toBe(
      "/api/v1/internal/safety/check",
    );
    expect((vi.mocked(fetch).mock.calls[1]?.[0] as URL).pathname).toBe("/api/v1/internal/handoffs");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toEqual({
      "content-type": "application/json",
    });
    const requestBody = vi.mocked(fetch).mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe("string");
    if (typeof requestBody !== "string") throw new Error("Expected a JSON request body");
    expect(JSON.parse(requestBody)).toEqual({
      sourceEventId: "00000000-0000-4000-8000-000000000403",
      message: "Synthetic message",
    });
    expect(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).toEqual({
      "content-type": "application/json",
    });
    const handoffBody = vi.mocked(fetch).mock.calls[1]?.[1]?.body;
    expect(typeof handoffBody).toBe("string");
    if (typeof handoffBody !== "string") throw new Error("Expected a JSON request body");
    expect(JSON.parse(handoffBody)).toEqual({
      idempotencyKey: "00000000-0000-4000-8000-000000000404",
      sourceEventId: "00000000-0000-4000-8000-000000000403",
    });
  });

  it("fails closed when the safety service is unavailable", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response("down", { status: 503 })),
    ) as unknown as typeof globalThis.fetch;
    const checker = new HttpSafetyChecker(options(fetch));

    await expect(
      checker.preCheck({
        userId: "00000000-0000-4000-8000-000000000400",
        sessionId: "00000000-0000-4000-8000-000000000402",
        conversationId: "00000000-0000-4000-8000-000000000401",
        sourceEventId: "00000000-0000-4000-8000-000000000403",
        content: "Synthetic message",
        occurredAt: "2026-08-11T05:00:00.000Z",
        profileSnapshotId: "00000000-0000-4000-8000-000000000406",
        segment: "pathfinder",
        language: "en",
      }),
    ).rejects.toBeInstanceOf(CounselorDependencyUnavailableError);
  });
});
