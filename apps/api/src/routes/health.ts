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
  checkDatabase?: () => Promise<boolean>,
  databaseRequired = true,
): void => {
  registry.registerPath({
    method: "get",
    path: "/api/v1/health",
    tags: ["System"],
    summary: "Check API health and module registration",
    responses: {
      200: {
        description: "API dependencies required by the selected runtime are healthy",
        content: { "application/json": { schema: HealthResponseSchema } },
      },
      503: {
        description: "API is running but the database is unavailable or not configured",
        content: { "application/json": { schema: HealthResponseSchema } },
      },
    },
  });

  app.get("/api/v1/health", async (_request, response) => {
    let databaseStatus: HealthResponse["database"]["status"] = databaseRequired
      ? "not_configured"
      : "not_required";
    if (databaseRequired && checkDatabase) {
      try {
        databaseStatus = (await checkDatabase()) ? "connected" : "disconnected";
      } catch {
        databaseStatus = "disconnected";
      }
    }
    const healthy = databaseStatus === "connected" || databaseStatus === "not_required";
    const body: HealthResponse = {
      status: healthy ? "ok" : "degraded",
      service: "yuvanext-api",
      timestamp: new Date().toISOString(),
      database: { status: databaseStatus },
      modules,
    };
    response.status(healthy ? 200 : 503).json(body);
  });
};
