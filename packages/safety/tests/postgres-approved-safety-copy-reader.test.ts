import { describe, expect, it, vi } from "vitest";
import { PostgresApprovedSafetyCopyReader } from "../src/index.js";

describe("PostgresApprovedSafetyCopyReader", () => {
  it("returns the exact approved copy for the requested policy version", async () => {
    const query = vi.fn(() =>
      Promise.resolve({
        rows: [
          {
            message_key: "mock_safety.tier_1",
            policy_version: "mock-safety-md-v1",
            language: "en",
            content: "Approved safety response.",
          },
        ],
      }),
    );
    const reader = new PostgresApprovedSafetyCopyReader({ query } as never);

    await expect(
      reader.getCopy({
        key: "mock_safety.tier_1",
        version: "mock-safety-md-v1",
        language: "en",
      }),
    ).resolves.toEqual({
      key: "mock_safety.tier_1",
      version: "mock-safety-md-v1",
      language: "en",
      text: "Approved safety response.",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("message.status = 'approved'"), [
      "mock_safety.tier_1",
      "mock-safety-md-v1",
      "en",
    ]);
  });

  it("returns null when no approved copy matches", async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [] }));
    const reader = new PostgresApprovedSafetyCopyReader({ query } as never);

    await expect(
      reader.getCopy({ key: "missing", version: "1", language: "en" }),
    ).resolves.toBeNull();
  });
});
