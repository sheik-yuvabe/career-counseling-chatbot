import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./domain/college.js";
export * from "./domain/streams.js";
export * from "./domain/career.js";
export * from "./domain/career-search.js";
export * from "./application/get-colleges.js";
export * from "./application/get-streams.js";
export * from "./application/get-career.js";
export * from "./application/search-careers.js";
export * from "./application/import-college-dataset.js";
export * from "./application/import-career-dataset.js";
export * from "./application/import-stream-dataset.js";
export * from "./application/list-colleges.js";
export * from "./application/validate-college-records.js";
export * from "./application/validate-career-records.js";
export * from "./application/validate-stream-records.js";
export * from "./infrastructure/in-memory-college-repository.js";
export * from "./infrastructure/in-memory-stream-repository.js";
export * from "./infrastructure/in-memory-career-repository.js";
export * from "./infrastructure/in-memory-career-search-repository.js";
export * from "./infrastructure/postgres-college-repository.js";
export * from "./infrastructure/postgres-stream-repository.js";
export * from "./infrastructure/postgres-college-dataset-publisher.js";
export * from "./infrastructure/postgres-career-repository.js";
export * from "./infrastructure/postgres-career-search-repository.js";
export * from "./infrastructure/postgres-career-dataset-publisher.js";
export * from "./infrastructure/postgres-stream-dataset-publisher.js";
export * from "./http/register-knowledge-routes.js";

export const knowledgeModule: ModuleDescriptor = {
  code: "m3",
  name: "Knowledge",
  packageName: "@yuvanext/knowledge",
  status: "scaffolded",
};
