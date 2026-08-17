import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./application/knowledge-reader.js";
export * from "./infrastructure/postgres-knowledge-reader.js";

export const knowledgeModule: ModuleDescriptor = {
  code: "m3",
  name: "Knowledge",
  packageName: "@yuvanext/knowledge",
  status: "in_progress",
};
