import { ProfileSnapshotSchema, UuidSchema, type ProfileSnapshot } from "@yuvanext/contracts";
import type { createDatabasePool, Database } from "@yuvanext/database";
import type {
  HandoffProfileContext,
  ProfileSnapshotReader,
  ReadProfileSnapshotInput,
} from "../application/profile-snapshot-reader.js";

type DatabasePool = ReturnType<typeof createDatabasePool>;
type ProfileSnapshotRow = Database["assessment"]["Tables"]["profile_snapshots"]["Row"] & {
  source_result_ids: string[];
};

type HandoffProfileRow = {
  first_name: string;
  age_band: string;
  segment: string;
  profile_snapshot_id: string;
  result_summary_json: unknown;
  consented_contact_available: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class PostgresProfileSnapshotReader implements ProfileSnapshotReader {
  constructor(private readonly pool: DatabasePool) {}

  async getProfileSnapshot(input: ReadProfileSnapshotInput): Promise<ProfileSnapshot | null> {
    const userId = UuidSchema.parse(input.userId);
    const profileSnapshotId = input.profileSnapshotId
      ? UuidSchema.parse(input.profileSnapshotId)
      : null;
    const result = await this.pool.query<ProfileSnapshotRow>(
      `select
        ps.*,
        coalesce(
          array_agg(psr.assessment_result_id order by psr.display_order)
            filter (where psr.assessment_result_id is not null),
          '{}'
        ) as source_result_ids
      from assessment.profile_snapshots ps
      left join assessment.profile_snapshot_results psr
        on psr.profile_snapshot_id = ps.id
      where ps.user_id = $1
        and ($2::uuid is null or ps.id = $2)
      group by ps.id
      order by ps.profile_version desc
      limit 1`,
      [userId, profileSnapshotId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const resultSummary = asRecord(row.result_summary_json);
    const optionalResults = Object.fromEntries(
      ["riasec", "values", "bigFive", "aptitude"]
        .filter((key) => resultSummary[key] !== undefined)
        .map((key) => [key, resultSummary[key]]),
    );

    return ProfileSnapshotSchema.parse({
      snapshotId: row.id,
      userId: row.user_id,
      segment: row.segment,
      ageBand: row.age_band,
      city: row.city,
      state: row.state,
      selfStage: row.self_stage,
      wantsAid: row.wants_aid,
      intakeSummary: asRecord(row.intake_summary_json),
      ...optionalResults,
      profileVersion: row.profile_version,
      algorithmVersion: row.algorithm_version,
      sourceResultIds: row.source_result_ids,
      createdAt: new Date(row.created_at).toISOString(),
    });
  }

  async getJourneySessionId(
    input: Required<ReadProfileSnapshotInput>,
  ): Promise<string | null> {
    const userId = UuidSchema.parse(input.userId);
    const profileSnapshotId = UuidSchema.parse(input.profileSnapshotId);
    const result = await this.pool.query<{ journey_session_id: string }>(
      `select ar.journey_session_id
       from assessment.profile_snapshots ps
       join assessment.profile_snapshot_results psr
         on psr.profile_snapshot_id = ps.id
       join assessment.assessment_results result
         on result.id = psr.assessment_result_id
       join assessment.assessment_runs ar
         on ar.id = result.assessment_run_id
       where ps.id = $1
         and ps.user_id = $2
         and ar.user_id = $2
       order by ar.started_at desc
       limit 1`,
      [profileSnapshotId, userId],
    );

    return result.rows[0]?.journey_session_id ?? null;
  }

  async getHandoffProfile(
    input: Required<ReadProfileSnapshotInput>,
  ): Promise<HandoffProfileContext | null> {
    const userId = UuidSchema.parse(input.userId);
    const profileSnapshotId = UuidSchema.parse(input.profileSnapshotId);
    const result = await this.pool.query<HandoffProfileRow>(
      `select
         profile.first_name,
         snapshot.age_band,
         snapshot.segment,
         snapshot.id as profile_snapshot_id,
         snapshot.result_summary_json,
         exists (
           select 1
           from assessment.guardian_consents consent
           where consent.user_id = profile.user_id
             and consent.status = 'granted'
             and consent.verified_at is not null
             and consent.revoked_at is null
         ) as consented_contact_available
       from assessment.profile_snapshots snapshot
       join assessment.user_profiles profile on profile.user_id = snapshot.user_id
       where snapshot.id = $1
         and snapshot.user_id = $2
         and profile.profile_status = 'active'
         and profile.deleted_at is null`,
      [profileSnapshotId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const summary = asRecord(row.result_summary_json);
    const riasec = asRecord(summary.riasec);
    return {
      firstName: row.first_name,
      ageBand: row.age_band,
      segment: row.segment as HandoffProfileContext["segment"],
      profileSnapshotId: row.profile_snapshot_id,
      ...(typeof riasec.code === "string" ? { code: riasec.code } : {}),
      ...(riasec.confidence === "normal" || riasec.confidence === "soft"
        ? { confidence: riasec.confidence }
        : {}),
      consentedContactAvailable: row.consented_contact_available,
    };
  }
}
