import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  HealthResponseSchema,
  type HealthResponse,
  type ModuleDescriptor,
} from "@yuvanext/contracts";
import type { Express } from "express";

export const registerHealthRoute = (
  app: Express,
  registry: OpenAPIRegistry,
  modules: ModuleDescriptor[],
): void => {
  registry.registerPath({
    method: "get",
    path: "/api/v1/health",
    tags: ["System"],
    summary: "Check API health and module registration",
    responses: {
      200: {
        description: "API is running",
        content: { "application/json": { schema: HealthResponseSchema } },
      },
    },
  });

  app.get("/api/v1/health", (_request, response) => {
    const body: HealthResponse = {
      status: "ok",
      service: "yuvanext-api",
      timestamp: new Date().toISOString(),
      modules,
    };
    response.status(200).json(body);
  });
};
