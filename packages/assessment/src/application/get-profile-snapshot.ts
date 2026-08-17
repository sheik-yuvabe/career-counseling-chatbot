import {
  ProfileSnapshotResponseSchema,
  UuidSchema,
  type ProfileSnapshotResponse,
} from "@yuvanext/contracts";
import type { ProfileSnapshotReader } from "./profile-snapshot-reader.js";

export class AssessmentProfileNotFoundError extends Error {
  constructor() {
    super("Profile snapshot was not found");
    this.name = "AssessmentProfileNotFoundError";
  }
}

export type GetProfileSnapshotCommand = {
  userId: string;
  profileSnapshotId?: string;
};

export class GetProfileSnapshotService {
  constructor(private readonly profiles: ProfileSnapshotReader) {}

  async execute(command: GetProfileSnapshotCommand): Promise<ProfileSnapshotResponse> {
    const userId = UuidSchema.parse(command.userId);
    const profileSnapshotId = command.profileSnapshotId
      ? UuidSchema.parse(command.profileSnapshotId)
      : undefined;
    const profile = await this.profiles.getProfileSnapshot({
      userId,
      ...(profileSnapshotId ? { profileSnapshotId } : {}),
    });
    if (!profile) {
      throw new AssessmentProfileNotFoundError();
    }
    return ProfileSnapshotResponseSchema.parse({ profile });
  }
}
