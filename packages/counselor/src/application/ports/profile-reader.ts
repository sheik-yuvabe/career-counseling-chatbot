import type { ProfileSnapshot } from "@yuvanext/contracts";

export type ReadProfileInput = {
  userId: string;
  profileSnapshotId?: string;
};

export type HandoffProfileContext = {
  firstName: string;
  ageBand: string;
  segment: "explorer" | "pathfinder" | "launcher";
  profileSnapshotId: string;
  code?: string;
  confidence?: string;
  consentedContactAvailable: boolean;
};

export interface ProfileReader {
  getProfileSnapshot(input: ReadProfileInput): Promise<ProfileSnapshot | null>;
  getJourneySessionId(input: Required<ReadProfileInput>): Promise<string | null>;
  getHandoffProfile(input: Required<ReadProfileInput>): Promise<HandoffProfileContext | null>;
}
