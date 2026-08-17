import type { ModuleDescriptor } from "@yuvanext/contracts";
export { registerSafetyRoutes } from "./http/safety-routes.js";
export { createSyntheticHandoffPacket } from "./domain/handoff-packets.js";
export { createSyntheticPrivacyJob, getSyntheticPrivacyJob } from "./domain/privacy-jobs.js";
export { createSyntheticQueueAction } from "./domain/queue-actions.js";
export { evaluateSafetyCheck, evaluateSyntheticSafetyCheck } from "./domain/safety-rules.js";
export { createSyntheticStaffPacket, createSyntheticStaffPacketView } from "./domain/staff-packets.js";
export {
  handoffPriorityByReason,
  listSyntheticStaffQueue,
  sortStaffQueueItems,
} from "./domain/staff-queue.js";
export {
  SAFETY_POLICY_VERSION,
  SAFETY_RULE_SET_VERSION,
  SAFETY_SOURCE_DOCUMENT_REF,
  SYNTHETIC_POLICY_VERSION,
  SYNTHETIC_RULE_SET_VERSION,
  approvedSafetyMessages,
  getApprovedSafetyMessage,
  safetyClassifierRules,
  syntheticSafetyRules,
} from "./domain/safety-policy.js";
export {
  createPostgresPrivacyJobRepository,
  type PrivacyJobRepository,
} from "./infrastructure/privacy-job-repository.js";
export {
  createPostgresSafetyOperationsRepository,
  type SafetyOperationsRepository,
} from "./infrastructure/safety-operations-repository.js";

export const safetyModule: ModuleDescriptor = {
  code: "m5-safety",
  name: "Safety and Operations",
  packageName: "@yuvanext/safety",
  status: "in_progress",
};
