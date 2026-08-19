import type { ProfileSnapshot } from "@yuvanext/contracts";

export type ReadProfileSnapshotInput = {
  userId: string;
  profileSnapshotId?: string;
};

export type HandoffProfileContext = {
  firstName: string;
  ageBand: string;
  segment: "explorer" | "pathfinder" | "launcher";
  profileSnapshotId: string;
  code?: string;
  confidence?: "normal" | "soft";
  consentedContactAvailable: boolean;
};

export interface ProfileSnapshotReader {
  getProfileSnapshot(input: ReadProfileSnapshotInput): Promise<ProfileSnapshot | null>;
  getJourneySessionId(input: Required<ReadProfileSnapshotInput>): Promise<string | null>;
  getHandoffProfile(
    input: Required<ReadProfileSnapshotInput>,
  ): Promise<HandoffProfileContext | null>;
}
