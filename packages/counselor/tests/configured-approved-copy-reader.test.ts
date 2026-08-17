import { describe, expect, it, vi } from "vitest";
import { CounselorContractError, ConfiguredApprovedCopyReader } from "../src/index.js";

const options = {
  version: "1",
  welcomeBySegment: {
    explorer: "Explorer welcome",
    pathfinder: "Pathfinder welcome",
    launcher: "Launcher welcome",
  },
  fallback: "Counselor fallback",
};

describe("ConfiguredApprovedCopyReader", () => {
  it("delegates Module 5 safety keys to the approved safety copy reader", async () => {
    const getCopy = vi.fn(() =>
      Promise.resolve({
        key: "mock_safety.tier_1",
        version: "mock-safety-md-v1",
        text: "Approved safety response.",
      }),
    );
    const reader = new ConfiguredApprovedCopyReader({ ...options, safety: { getCopy } });
    const input = {
      key: "mock_safety.tier_1",
      version: "mock-safety-md-v1",
      language: "en" as const,
    };

    await expect(reader.getCopy(input)).resolves.toEqual({
      key: input.key,
      version: input.version,
      text: "Approved safety response.",
    });
    expect(getCopy).toHaveBeenCalledWith(input);
  });

  it("raises a controlled contract error when approved copy is unavailable", async () => {
    const reader = new ConfiguredApprovedCopyReader({
      ...options,
      safety: { getCopy: vi.fn(() => Promise.resolve(null)) },
    });

    await expect(
      reader.getCopy({ key: "missing", version: "1", language: "en" }),
    ).rejects.toBeInstanceOf(CounselorContractError);
  });
});
