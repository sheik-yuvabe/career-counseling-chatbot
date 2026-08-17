import { ProfileSnapshotSchema, type ProfileSnapshot } from "@yuvanext/contracts";
import type { ProfileReader, ReadProfileInput } from "../../application/index.js";

export class FixtureProfileReader implements ProfileReader {
  private readonly snapshots: ProfileSnapshot[];

  constructor(snapshots: ProfileSnapshot[]) {
    this.snapshots = snapshots.map((snapshot) => ProfileSnapshotSchema.parse(snapshot));
  }

  getProfileSnapshot(input: ReadProfileInput): Promise<ProfileSnapshot | null> {
    const matches = this.snapshots.filter(
      (snapshot) =>
        snapshot.userId === input.userId &&
        (!input.profileSnapshotId || snapshot.snapshotId === input.profileSnapshotId),
    );

    return Promise.resolve(matches.at(-1) ?? null);
  }

  getJourneySessionId(input: Required<ReadProfileInput>): Promise<string | null> {
    const snapshot = this.snapshots.find(
      (candidate) =>
        candidate.userId === input.userId && candidate.snapshotId === input.profileSnapshotId,
    );
    return Promise.resolve(snapshot?.snapshotId ?? null);
  }

  getHandoffProfile(input: Required<ReadProfileInput>) {
    const snapshot = this.snapshots.find(
      (candidate) =>
        candidate.userId === input.userId && candidate.snapshotId === input.profileSnapshotId,
    );
    if (!snapshot) return Promise.resolve(null);
    return Promise.resolve({
      firstName: "Synthetic",
      ageBand: snapshot.ageBand,
      segment: snapshot.segment,
      profileSnapshotId: snapshot.snapshotId,
      ...(snapshot.riasec?.code ? { code: snapshot.riasec.code } : {}),
      ...(snapshot.riasec?.confidence ? { confidence: snapshot.riasec.confidence } : {}),
      consentedContactAvailable: true,
    });
  }
}
