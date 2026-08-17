import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./application/profile-snapshot-reader.js";
export * from "./application/get-profile-snapshot.js";
export * from "./http/register-assessment-routes.js";
export * from "./infrastructure/postgres-profile-snapshot-reader.js";

export const assessmentModule: ModuleDescriptor = {
  code: "m1",
  name: "Assessment",
  packageName: "@yuvanext/assessment",
  status: "in_progress",
};
