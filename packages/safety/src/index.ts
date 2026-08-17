import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./infrastructure/postgres-approved-safety-copy-reader.js";

export const safetyModule: ModuleDescriptor = {
  code: "m5-safety",
  name: "Safety and Operations",
  packageName: "@yuvanext/safety",
  status: "scaffolded",
};
