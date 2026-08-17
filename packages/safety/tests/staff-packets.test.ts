import { describe, expect, it } from "vitest";
import { StaffPacketResponseSchema } from "@yuvanext/contracts";
import { createSyntheticStaffPacket, createSyntheticStaffPacketView } from "../src/index.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("staff packets", () => {
  it("redacts conversation excerpts by default", () => {
    const packet = createSyntheticStaffPacket(userId, false);

    expect(packet.conversationExcerpts).toBeUndefined();
  });

  it("includes bounded conversation excerpts when explicitly requested", () => {
    const packet = createSyntheticStaffPacket(userId, true);

    expect(packet.conversationExcerpts).toHaveLength(1);
    expect(packet.conversationExcerpts?.[0]?.content).toContain("Synthetic flagged excerpt");
  });

  it("creates a contract-valid packet view with safe audit metadata", () => {
    const response = createSyntheticStaffPacketView(userId, true, userId);

    expect(StaffPacketResponseSchema.parse(response).auditEvent.safeMetadata).toEqual({
      includeFlaggedExcerpt: true,
      hasSafetyEvent: true,
      highestTier: "tier_1",
    });
  });
});
