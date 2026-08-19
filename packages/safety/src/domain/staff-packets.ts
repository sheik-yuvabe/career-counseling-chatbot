import type { AuditEvent, StaffPacket, StaffPacketResponse } from "@yuvanext/contracts";

const syntheticPacketSnapshot = {
  firstName: "Asha",
  ageBand: "16-18",
  segment: "explorer",
  state: "Tamil Nadu",
  profileSnapshotId: "12111111-1111-4111-8111-111111111111",
  recommendationSetId: "13111111-1111-4111-8111-111111111111",
} as const;

export function createSyntheticStaffPacket(
  userId: string,
  includeFlaggedExcerpt: boolean,
): StaffPacket {
  return {
    userId,
    user: {
      firstName: syntheticPacketSnapshot.firstName,
      ageBand: syntheticPacketSnapshot.ageBand,
      segment: syntheticPacketSnapshot.segment,
    },
    intake: {
      state: syntheticPacketSnapshot.state,
      instruments: ["mini_ip"],
      completionPercent: 100,
    },
    profile: {
      profileSnapshotId: syntheticPacketSnapshot.profileSnapshotId,
      code: "RIA",
      confidence: "normal",
    },
    recommendations: {
      recommendationSetId: syntheticPacketSnapshot.recommendationSetId,
      versionHash: "synthetic-rec-hash-v1",
      itemCount: 3,
    },
    flags: {
      hasSafetyEvent: true,
      handoffStatus: "alerted",
      highestTier: "tier_1",
    },
    conversationExcerpts: includeFlaggedExcerpt
      ? [
          {
            role: "user",
            content: "Synthetic flagged excerpt for authorized staff packet view.",
            occurredAt: "2026-07-30T10:00:00.000Z",
          },
        ]
      : undefined,
  };
}

export function createSyntheticStaffPacketView(
  userId: string,
  includeFlaggedExcerpt: boolean,
  requestCorrelationId: string,
): StaffPacketResponse {
  const packet = createSyntheticStaffPacket(userId, includeFlaggedExcerpt);
  const auditEvent: AuditEvent = {
    id: requestCorrelationId,
    actorType: "staff",
    actorId: null,
    action: "staff.packet.view",
    targetType: "user_profile",
    targetId: userId,
    requestCorrelationId,
    safeMetadata: {
      includeFlaggedExcerpt,
      hasSafetyEvent: packet.flags.hasSafetyEvent,
      highestTier: packet.flags.highestTier ?? null,
    },
    ipHash: null,
    occurredAt: "2026-07-30T10:00:00.000Z",
  };

  return { packet, auditEvent };
}
