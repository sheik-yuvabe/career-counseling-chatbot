// Export only synthetic, versioned fixtures. Real user data is forbidden here.
export const FIXTURE_SCHEMA_VERSION = 1 as const;

export * from "./catalog/colleges.js";
export * from "./catalog/invalid-colleges.js";
