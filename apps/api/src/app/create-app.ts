import { createOpenApiRegistry, generateOpenApiDocument } from "@yuvanext/contracts";
import { createDatabasePool } from "@yuvanext/database";
import {
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryStreamRepository,
  type CareerRepository,
  type CareerSearchRepository,
  type CollegeRepository,
  type StreamRepository,
  PostgresCareerRepository,
  PostgresCareerSearchRepository,
  PostgresCollegeRepository,
  PostgresStreamRepository,
  registerKnowledgeRoutes,
} from "@yuvanext/knowledge";
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
  careerRepository?: CareerRepository;
  careerSearchRepository?: CareerSearchRepository;
  collegeRepository?: CollegeRepository;
  streamRepository?: StreamRepository;
};

type KnowledgeRepositories = {
  careerRepository: CareerRepository;
  careerSearchRepository: CareerSearchRepository;
  collegeRepository: CollegeRepository;
  streamRepository: StreamRepository;
};

const createDefaultKnowledgeRepositories = (): KnowledgeRepositories => {
  if (env.DATABASE_URL === undefined) {
    return {
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      streamRepository: new InMemoryStreamRepository([], [], []),
    };
  }

  const pool = createDatabasePool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
  });

  return {
    careerRepository: new PostgresCareerRepository(pool),
    careerSearchRepository: new PostgresCareerSearchRepository(pool),
    collegeRepository: new PostgresCollegeRepository(pool),
    streamRepository: new PostgresStreamRepository(pool),
  };
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
  const defaultKnowledgeRepositories =
    options.careerRepository === undefined ||
    options.careerSearchRepository === undefined ||
    options.collegeRepository === undefined ||
    options.streamRepository === undefined
      ? createDefaultKnowledgeRepositories()
      : undefined;
  registerKnowledgeRoutes(app, registry, {
    careerRepository: options.careerRepository ?? defaultKnowledgeRepositories!.careerRepository,
    careerSearchRepository:
      options.careerSearchRepository ?? defaultKnowledgeRepositories!.careerSearchRepository,
    collegeRepository: options.collegeRepository ?? defaultKnowledgeRepositories!.collegeRepository,
    streamRepository:
      options.streamRepository ??
      defaultKnowledgeRepositories!.streamRepository,
  });

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
