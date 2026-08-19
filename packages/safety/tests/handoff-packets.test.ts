import { describe, expect, it } from "vitest";
import {
  ResolvedCreateHandoffRequestSchema as CreateHandoffRequestSchema,
  CreateHandoffResponseSchema,
} from "@yuvanext/contracts";
import { createSyntheticHandoffPacket } from "../src/index.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-07-29T10:00:00.000Z";

const baseRequest = CreateHandoffRequestSchema.parse({
  idempotencyKey: uuid,
  sourceEventId: "11111111-1111-4111-8111-111111111112",
  userId: uuid,
  reason: "tier_1",
  user: {
    firstName: "Asha",
    ageBand: "16-18",
    segment: "explorer",
  },
  profile: {
    profileSnapshotId: uuid,
    code: "RIA",
    confidence: "normal",
  },
  trigger: {
    occurredAt: timestamp,
  },
  consentedContactAvailable: true,
  requestCorrelationId: uuid,
});

describe("synthetic handoff packets", () => {
  it("creates an alerted Tier 1 packet using the idempotency key", () => {
    const packet = createSyntheticHandoffPacket(baseRequest);

    expect(CreateHandoffResponseSchema.parse({ packet })).toEqual({
      packet: {
        handoffId: uuid,
        user: baseRequest.user,
        profile: baseRequest.profile,
        trigger: {
          reason: "tier_1",
          occurredAt: timestamp,
        },
        consentedContactAvailable: true,
        status: "alerted",
      },
    });
  });

  it("creates a queued Tier 2 packet", () => {
    const packet = createSyntheticHandoffPacket({ ...baseRequest, reason: "tier_2" });

    expect(packet.status).toBe("queued");
    expect(packet.trigger.reason).toBe("tier_2");
  });
});
