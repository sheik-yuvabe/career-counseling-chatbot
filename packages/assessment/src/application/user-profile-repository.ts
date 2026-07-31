import type { UserProfile } from "@yuvanext/contracts";

export type UpsertUserProfileRecord = {
  userId: string;
  firstName: string;
  ageAtOnboarding: number;
  ageBand: string;
  city: string;
  state: string;
  countryCode: string;
  segment: string;
  selfStage: string;
  wantsAid: boolean;
  profileStatus: "active";
  now: string;
};

export type UserProfileRepository = {
  upsert(input: UpsertUserProfileRecord): Promise<UserProfile>;
  findByUserId(userId: string): Promise<UserProfile | null>;
};
