import type { ProfileSnapshot } from "@yuvanext/contracts";
import { describe, expect, it, vi } from "vitest";
import { PostgresProfileSnapshotReader } from "../src/index.js";

type ReaderPool = ConstructorParameters<typeof PostgresProfileSnapshotReader>[0];

const profile: ProfileSnapshot = {
  snapshotId: "00000000-0000-4000-8000-000000000406",
  userId: "00000000-0000-4000-8000-000000000400",
  segment: "pathfinder",
  ageBand: "16-18",
  city: "Synthetic City",
  state: "Synthetic State",
  selfStage: "exploring",
  wantsAid: true,
  intakeSummary: { preferredLearningMode: "practical" },
  riasec: {
    rawScores: { R: 3, I: 5, A: 2, S: 4, E: 1, C: 3 },
    normalizedScores: { R: 60, I: 100, A: 40, S: 80, E: 20, C: 60 },
    code: "ISR",
    confidence: "normal",
    closeScores: false,
    instrumentCode: "synthetic-riasec",
    instrumentVersion: "1",
  },
  profileVersion: 1,
  algorithmVersion: "synthetic-profile-v1",
  sourceResultIds: ["00000000-0000-4000-8000-000000000416"],
  createdAt: "2026-07-28T08:00:00.000Z",
};

const profileRow = {
  id: profile.snapshotId,
  user_id: profile.userId,
  profile_version: profile.profileVersion,
  segment: profile.segment,
  age_band: profile.ageBand,
  city: profile.city,
  state: profile.state,
  self_stage: profile.selfStage,
  wants_aid: profile.wantsAid,
  intake_summary_json: profile.intakeSummary,
  result_summary_json: { riasec: profile.riasec },
  algorithm_version: profile.algorithmVersion,
  snapshot_schema_version: 1,
  payload_hash: "sha256:synthetic-profile",
  created_at: profile.createdAt,
  source_result_ids: profile.sourceResultIds,
};

const createReader = (rows: unknown[]) => {
  const query = vi.fn(() => Promise.resolve({ rows }));
  return {
    query,
    reader: new PostgresProfileSnapshotReader({
      query,
    } as unknown as ReaderPool),
  };
};

describe("PostgresProfileSnapshotReader", () => {
  it("loads and maps an owned snapshot through the shared contract", async () => {
    const { query, reader } = createReader([profileRow]);

    await expect(
      reader.getProfileSnapshot({
        userId: profile.userId,
        profileSnapshotId: profile.snapshotId,
      }),
    ).resolves.toEqual(profile);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("where ps.user_id = $1"), [
      profile.userId,
      profile.snapshotId,
    ]);
  });

  it("selects the latest owned snapshot when no snapshot ID is supplied", async () => {
    const { query, reader } = createReader([profileRow]);

    await expect(reader.getProfileSnapshot({ userId: profile.userId })).resolves.toEqual(profile);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("order by ps.profile_version desc"),
      [profile.userId, null],
    );
  });

  it("returns null when the ownership-scoped query finds no snapshot", async () => {
    const { reader } = createReader([]);

    await expect(
      reader.getProfileSnapshot({
        userId: "00000000-0000-4000-8000-000000000499",
        profileSnapshotId: profile.snapshotId,
      }),
    ).resolves.toBeNull();
  });

  it("resolves the assessment journey session through the profile source results", async () => {
    const journeySessionId = "00000000-0000-4000-8000-000000000417";
    const { query, reader } = createReader([{ journey_session_id: journeySessionId }]);

    await expect(
      reader.getJourneySessionId({
        userId: profile.userId,
        profileSnapshotId: profile.snapshotId,
      }),
    ).resolves.toBe(journeySessionId);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("join assessment.assessment_runs ar"),
      [profile.snapshotId, profile.userId],
    );
  });

  it("returns the bounded Module 1 context required for a safety handoff", async () => {
    const { query, reader } = createReader([
      {
        first_name: "Synthetic",
        age_band: profile.ageBand,
        segment: profile.segment,
        profile_snapshot_id: profile.snapshotId,
        result_summary_json: { riasec: profile.riasec },
        consented_contact_available: true,
      },
    ]);

    await expect(
      reader.getHandoffProfile({
        userId: profile.userId,
        profileSnapshotId: profile.snapshotId,
      }),
    ).resolves.toEqual({
      firstName: "Synthetic",
      ageBand: profile.ageBand,
      segment: profile.segment,
      profileSnapshotId: profile.snapshotId,
      code: profile.riasec?.code,
      confidence: profile.riasec?.confidence,
      consentedContactAvailable: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("from assessment.guardian_consents consent"),
      [profile.snapshotId, profile.userId],
    );
  });
});
