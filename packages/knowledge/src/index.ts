import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./domain/college.js";
export * from "./application/list-colleges.js";
export const knowledgeModule: ModuleDescriptor = {
  code: "m3",
  name: "Knowledge",
  packageName: "@yuvanext/knowledge",
  status: "scaffolded",
};
