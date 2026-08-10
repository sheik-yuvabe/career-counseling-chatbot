import { registerAssessmentRoutes } from "@yuvanext/assessment";
import { createDatabasePool } from "@yuvanext/database";
import { createOpenApiRegistry, generateOpenApiDocument } from "@yuvanext/contracts";
import {
  createPostgresRecommendationDataSource,
  createPostgresRecommendationStore,
  registerRecommendationRoutes,
  type RecommendationStore,
} from "@yuvanext/recommendations";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";
import { errorHandler, notFoundHandler } from "../middleware/error-handler.js";
import { requestLogger } from "../middleware/request-logger.js";
import { registerHealthRoute } from "../routes/health.js";
import { modules } from "./modules.js";

export type CreateAppOptions = {
  logging?: boolean;
  recommendationStore?: RecommendationStore;
};

export const createApp = (options: CreateAppOptions = {}): Express => {
  const app = express();
  const registry = createOpenApiRegistry();

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }),
  );
  app.use(express.json({ limit: "1mb" }));

  if (options.logging !== false) {
    app.use(requestLogger);
  }

  registerHealthRoute(app, registry, modules);
  const databasePool = env.DATABASE_URL
    ? createDatabasePool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL })
    : undefined;

  registerAssessmentRoutes(
    app,
    registry,
    databasePool ? { pool: databasePool } : {},
  );
  const recommendationStore =
    options.recommendationStore ??
    (databasePool ? createPostgresRecommendationStore({ pool: databasePool }) : undefined);
  if (recommendationStore) {
    registerRecommendationRoutes(app, registry, {
      store: recommendationStore,
      ...(databasePool ? { dataSource: createPostgresRecommendationDataSource(databasePool) } : {}),
    });
  }

  const openApiDocument = generateOpenApiDocument(registry);
  app.get("/openapi.json", (_request, response) => response.json(openApiDocument));
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerOptions: { url: "/openapi.json" } }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
