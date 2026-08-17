import type { Pool } from "pg";
import type { AuditEvent, PrivacyJob, PrivacyJobRequest, PrivacyJobResponse } from "@yuvanext/contracts";
import { withTransaction } from "@yuvanext/database";
import { createSyntheticPrivacyJob } from "../domain/privacy-jobs.js";

type PrivacyJobRow = {
  attempt_count: number | null;
  authorization_method: string | null;
  completed_at: Date | string | null;
  deadline_at: Date | string;
  error_code: string | null;
  id: string;
  job_type: string;
  requested_at: Date | string;
  requested_by: string;
  result_asset_ref: string | null;
  result_expires_at: Date | string | null;
  status: string;
  user_id: string;
};

type AuditEventRow = {
  action: string;
  actor_id: string | null;
  actor_type: string;
  id: string;
  ip_hash: string | null;
  occurred_at: Date | string;
  request_correlation_id: string;
  safe_metadata_json: unknown;
  target_id: string | null;
  target_type: string;
};

export type PrivacyJobRepository = {
  createJob: (
    jobType: PrivacyJob["jobType"],
    request: PrivacyJobRequest,
  ) => Promise<PrivacyJobResponse>;
  getJob: (jobId: string) => Promise<PrivacyJobResponse | undefined>;
};

const asIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toPrivacyJob = (row: PrivacyJobRow): PrivacyJob => ({
  jobId: row.id,
  userId: row.user_id,
  jobType: row.job_type as PrivacyJob["jobType"],
  status: row.status as PrivacyJob["status"],
  deadlineAt: asIsoString(row.deadline_at),
  resultAssetRef: row.result_asset_ref ?? undefined,
  resultExpiresAt: row.result_expires_at ? asIsoString(row.result_expires_at) : undefined,
  attemptCount: row.attempt_count ?? 0,
  errorCode: row.error_code ?? undefined,
  requestedAt: asIsoString(row.requested_at),
  completedAt: row.completed_at ? asIsoString(row.completed_at) : undefined,
});

const toAuditEvent = (row: AuditEventRow): AuditEvent => ({
  id: row.id,
  actorType: row.actor_type as AuditEvent["actorType"],
  actorId: row.actor_id,
  action: row.action as AuditEvent["action"],
  targetType: row.target_type as AuditEvent["targetType"],
  targetId: row.target_id,
  requestCorrelationId: row.request_correlation_id,
  safeMetadata:
    row.safe_metadata_json && typeof row.safe_metadata_json === "object"
      ? (row.safe_metadata_json as AuditEvent["safeMetadata"])
      : {},
  ipHash: row.ip_hash,
  occurredAt: asIsoString(row.occurred_at),
});

export const createPostgresPrivacyJobRepository = (pool: Pool): PrivacyJobRepository => ({
  async createJob(jobType, request) {
    const syntheticResponse = createSyntheticPrivacyJob(jobType, request);
    const { job, auditEvent } = syntheticResponse;

    return withTransaction(pool, async (client) => {
      const jobResult = await client.query<PrivacyJobRow>(
        `
          insert into operations.privacy_jobs (
            id,
            user_id,
            job_type,
            requested_by,
            authorization_method,
            status,
            deadline_at,
            attempt_count,
            requested_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do update set
            user_id = excluded.user_id,
            job_type = excluded.job_type,
            requested_by = excluded.requested_by,
            authorization_method = excluded.authorization_method,
            status = excluded.status,
            deadline_at = excluded.deadline_at,
            attempt_count = excluded.attempt_count,
            requested_at = excluded.requested_at
          returning *
        `,
        [
          job.jobId,
          job.userId,
          job.jobType,
          request.requestedBy,
          request.authorizationMethod,
          job.status,
          job.deadlineAt,
          job.attemptCount,
          job.requestedAt,
        ],
      );

      const auditResult = await client.query<AuditEventRow>(
        `
          insert into operations.audit_events (
            id,
            actor_type,
            actor_id,
            action,
            target_type,
            target_id,
            request_correlation_id,
            safe_metadata_json,
            ip_hash,
            occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
          on conflict (id) do update set
            actor_type = excluded.actor_type,
            actor_id = excluded.actor_id,
            action = excluded.action,
            target_type = excluded.target_type,
            target_id = excluded.target_id,
            request_correlation_id = excluded.request_correlation_id,
            safe_metadata_json = excluded.safe_metadata_json,
            ip_hash = excluded.ip_hash,
            occurred_at = excluded.occurred_at
          returning *
        `,
        [
          auditEvent.id,
          auditEvent.actorType,
          auditEvent.actorId,
          auditEvent.action,
          auditEvent.targetType,
          auditEvent.targetId,
          auditEvent.requestCorrelationId,
          JSON.stringify(auditEvent.safeMetadata),
          auditEvent.ipHash,
          auditEvent.occurredAt,
        ],
      );

      const jobRow = jobResult.rows[0];
      const auditRow = auditResult.rows[0];

      if (!jobRow || !auditRow) {
        throw new Error("Privacy job persistence did not return inserted rows.");
      }

      return { job: toPrivacyJob(jobRow), auditEvent: toAuditEvent(auditRow) };
    });
  },

  async getJob(jobId) {
    return withTransaction(pool, async (client) => {
      const jobResult = await client.query<PrivacyJobRow>(
        "select * from operations.privacy_jobs where id = $1",
        [jobId],
      );
      const jobRow = jobResult.rows[0];

      if (!jobRow) {
        return undefined;
      }

      const job = toPrivacyJob(jobRow);
      const auditEvent: AuditEvent = {
        id: jobId,
        actorType: "user",
        actorId: job.userId,
        action: "privacy.export.access",
        targetType: "privacy_job",
        targetId: jobId,
        requestCorrelationId: jobId,
        safeMetadata: {
          jobType: job.jobType,
          status: job.status,
        },
        ipHash: null,
        occurredAt: job.requestedAt,
      };

      await client.query(
        `
          insert into operations.audit_events (
            id,
            actor_type,
            actor_id,
            action,
            target_type,
            target_id,
            request_correlation_id,
            safe_metadata_json,
            ip_hash,
            occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
          on conflict (id) do nothing
        `,
        [
          auditEvent.id,
          auditEvent.actorType,
          auditEvent.actorId,
          auditEvent.action,
          auditEvent.targetType,
          auditEvent.targetId,
          auditEvent.requestCorrelationId,
          JSON.stringify(auditEvent.safeMetadata),
          auditEvent.ipHash,
          auditEvent.occurredAt,
        ],
      );

      return { job, auditEvent };
    });
  },
});
