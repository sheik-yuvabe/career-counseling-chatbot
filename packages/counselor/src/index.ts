import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./application/index.js";
export * from "./http/index.js";
export * from "./infrastructure/index.js";

export const counselorModule: ModuleDescriptor = {
  code: "m4",
  name: "AI Counselor",
  packageName: "@yuvanext/counselor",
  status: "in_progress",
};
