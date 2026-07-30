import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./domain/college.js";
export * from "./application/get-colleges.js";
export * from "./application/import-college-dataset.js";
export * from "./application/list-colleges.js";
export * from "./application/validate-college-records.js";
export * from "./infrastructure/in-memory-college-repository.js";
export * from "./infrastructure/postgres-college-repository.js";
export * from "./infrastructure/postgres-college-dataset-publisher.js";
export * from "./http/register-knowledge-routes.js";

export const knowledgeModule: ModuleDescriptor = {
  code: "m3",
  name: "Knowledge",
  packageName: "@yuvanext/knowledge",
  status: "scaffolded",
};
