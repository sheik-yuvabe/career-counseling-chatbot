import { UserProfileSchema, type UserProfile } from "@yuvanext/contracts";
import type { Pool } from "pg";
import type {
  UpsertUserProfileRecord,
  UserProfileRepository,
} from "../application/user-profile-repository.js";

type UserProfileRow = {
  user_id: string;
  first_name: string;
  age_at_onboarding: number;
  age_band: string;
  city: string;
  state: string;
  country_code: string;
  segment: string;
  self_stage: string;
  wants_aid: boolean;
  profile_status: "active" | "deletion_pending" | "deleted";
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const mapUserProfileRow = (row: UserProfileRow): UserProfile =>
  UserProfileSchema.parse({
    userId: row.user_id,
    firstName: row.first_name,
    ageAtOnboarding: row.age_at_onboarding,
    ageBand: row.age_band,
    city: row.city,
    state: row.state,
    countryCode: row.country_code,
    segment: row.segment,
    selfStage: row.self_stage,
    wantsAid: row.wants_aid,
    profileStatus: row.profile_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  });

export class PgUserProfileRepository implements UserProfileRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(input: UpsertUserProfileRecord): Promise<UserProfile> {
    const result = await this.pool.query<UserProfileRow>(
      `
        insert into assessment.user_profiles (
          user_id,
          first_name,
          age_at_onboarding,
          age_band,
          city,
          state,
          country_code,
          segment,
          self_stage,
          wants_aid,
          profile_status,
          created_at,
          updated_at,
          deleted_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, null)
        on conflict (user_id) do update set
          first_name = excluded.first_name,
          age_at_onboarding = excluded.age_at_onboarding,
          age_band = excluded.age_band,
          city = excluded.city,
          state = excluded.state,
          country_code = excluded.country_code,
          segment = excluded.segment,
          self_stage = excluded.self_stage,
          wants_aid = excluded.wants_aid,
          profile_status = 'active',
          updated_at = excluded.updated_at,
          deleted_at = null
        returning *
      `,
      [
        input.userId,
        input.firstName,
        input.ageAtOnboarding,
        input.ageBand,
        input.city,
        input.state,
        input.countryCode,
        input.segment,
        input.selfStage,
        input.wantsAid,
        input.profileStatus,
        input.now,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("User profile upsert returned no row.");
    }
    return mapUserProfileRow(row);
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const result = await this.pool.query<UserProfileRow>(
      `
        select *
        from assessment.user_profiles
        where user_id = $1 and profile_status = 'active'
        limit 1
      `,
      [userId],
    );

    const row = result.rows[0];
    return row ? mapUserProfileRow(row) : null;
  }
}
