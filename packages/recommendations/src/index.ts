import type { ModuleDescriptor } from "@yuvanext/contracts";

export * from "./application/get-recommendation-set.js";
export * from "./application/recommendation-set-reader.js";
export * from "./http/register-recommendation-routes.js";
export * from "./infrastructure/fixture-recommendation-set-reader.js";
export * from "./infrastructure/postgres-recommendation-set-reader.js";

export const recommendationsModule: ModuleDescriptor = {
  code: "m2",
  name: "Recommendations",
  packageName: "@yuvanext/recommendations",
  status: "in_progress",
};
