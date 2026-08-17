import type {
  AuditEvent,
  PrivacyJob,
  PrivacyJobRequest,
  PrivacyJobResponse,
} from "@yuvanext/contracts";

const syntheticJobRequestedAt = "2026-07-30T12:00:00.000Z";

function deadlineFor(jobType: PrivacyJob["jobType"], requestedAt: string): string {
  const requestedAtDate = new Date(requestedAt);
  const hoursToAdd = jobType === "delete" ? 72 : 24;
  requestedAtDate.setUTCHours(requestedAtDate.getUTCHours() + hoursToAdd);
  return requestedAtDate.toISOString();
}

function auditActionFor(jobType: PrivacyJob["jobType"]): AuditEvent["action"] {
  return jobType === "export" ? "privacy.export.request" : "privacy.delete.request";
}

export function createSyntheticPrivacyJob(
  jobType: PrivacyJob["jobType"],
  request: PrivacyJobRequest,
): PrivacyJobResponse {
  const job: PrivacyJob = {
    jobId: request.idempotencyKey,
    userId: request.userId,
    jobType,
    status: "queued",
    deadlineAt: deadlineFor(jobType, request.requestedAt),
    attemptCount: 0,
    requestedAt: request.requestedAt,
  };

  const auditEvent: AuditEvent = {
    id: request.requestCorrelationId,
    actorType: "user",
    actorId: request.requestedBy,
    action: auditActionFor(jobType),
    targetType: "privacy_job",
    targetId: job.jobId,
    requestCorrelationId: request.requestCorrelationId,
    safeMetadata: {
      jobType,
      authorizationMethod: request.authorizationMethod,
      status: job.status,
    },
    ipHash: null,
    occurredAt: request.requestedAt,
  };

  return { job, auditEvent };
}

export function getSyntheticPrivacyJob(jobId: string): PrivacyJobResponse {
  const job: PrivacyJob = {
    jobId,
    userId: "21111111-1111-4111-8111-111111111111",
    jobType: "export",
    status: "queued",
    deadlineAt: deadlineFor("export", syntheticJobRequestedAt),
    attemptCount: 0,
    requestedAt: syntheticJobRequestedAt,
  };

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
    occurredAt: syntheticJobRequestedAt,
  };

  return { job, auditEvent };
}
