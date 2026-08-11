import { timingSafeEqual } from "node:crypto";
import { registerAssessmentRoutes } from "@yuvanext/assessment";
import { createOpenApiRegistry, generateOpenApiDocument } from "@yuvanext/contracts";
import { createDatabasePool } from "@yuvanext/database";
import {
  InMemoryAidSchemeRepository,
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryDatasetRepository,
  InMemoryStreamRepository,
  LocalCatalogImportCoordinator,
  PostgresAidSchemeRepository,
  PostgresCareerRepository,
  PostgresCareerSearchRepository,
  PostgresCollegeRepository,
  PostgresDatasetRepository,
  PostgresStreamRepository,
  registerKnowledgeRoutes,
  type AidSchemeRepository,
  type CareerRepository,
  type CareerSearchRepository,
  type CatalogImportCoordinator,
  type CollegeRepository,
  type DatasetRepository,
  type StreamRepository,
} from "@yuvanext/knowledge";
import {
  createPostgresRecommendationDataSource,
  createPostgresRecommendationStore,
  registerRecommendationRoutes,
  type RecommendationStore,
} from "@yuvanext/recommendations";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";
import { errorHandler, notFoundHandler } from "../middleware/error-handler.js";
import { requestLogger } from "../middleware/request-logger.js";
import { registerHealthRoute } from "../routes/health.js";
import { modules } from "./modules.js";

export type CreateAppOptions = {
  logging?: boolean;
  recommendationStore?: RecommendationStore;
  careerRepository?: CareerRepository;
  careerSearchRepository?: CareerSearchRepository;
  collegeRepository?: CollegeRepository;
  streamRepository?: StreamRepository;
  aidSchemeRepository?: AidSchemeRepository;
  datasetRepository?: DatasetRepository;
  catalogImportCoordinator?: CatalogImportCoordinator;
  internalApiKey?: string;
};

type KnowledgeRepositories = {
  careerRepository: CareerRepository;
  careerSearchRepository: CareerSearchRepository;
  collegeRepository: CollegeRepository;
  streamRepository: StreamRepository;
  aidSchemeRepository: AidSchemeRepository;
  datasetRepository: DatasetRepository;
  catalogImportCoordinator?: CatalogImportCoordinator;
};

const createDefaultKnowledgeRepositories = (pool: Pool | undefined): KnowledgeRepositories => {
  if (!pool) {
    return {
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      streamRepository: new InMemoryStreamRepository([], [], []),
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([]),
    };
  }

  return {
    careerRepository: new PostgresCareerRepository(pool),
    careerSearchRepository: new PostgresCareerSearchRepository(pool),
    collegeRepository: new PostgresCollegeRepository(pool),
    streamRepository: new PostgresStreamRepository(pool),
    aidSchemeRepository: new PostgresAidSchemeRepository(pool),
    datasetRepository: new PostgresDatasetRepository(pool),
    catalogImportCoordinator: new LocalCatalogImportCoordinator(pool),
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
  const databasePool = env.DATABASE_URL
    ? createDatabasePool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL })
    : undefined;

  registerAssessmentRoutes(app, registry, databasePool ? { pool: databasePool } : {});

  const recommendationStore =
    options.recommendationStore ??
    (databasePool ? createPostgresRecommendationStore({ pool: databasePool }) : undefined);
  if (recommendationStore) {
    registerRecommendationRoutes(app, registry, {
      store: recommendationStore,
      ...(databasePool ? { dataSource: createPostgresRecommendationDataSource(databasePool) } : {}),
    });
  }

  const defaultKnowledgeRepositories =
    options.careerRepository === undefined ||
    options.careerSearchRepository === undefined ||
    options.collegeRepository === undefined ||
    options.streamRepository === undefined ||
    options.aidSchemeRepository === undefined ||
    options.datasetRepository === undefined
      ? createDefaultKnowledgeRepositories(databasePool)
      : undefined;
  registerKnowledgeRoutes(app, registry, {
    careerRepository: options.careerRepository ?? defaultKnowledgeRepositories!.careerRepository,
    careerSearchRepository:
      options.careerSearchRepository ?? defaultKnowledgeRepositories!.careerSearchRepository,
    collegeRepository: options.collegeRepository ?? defaultKnowledgeRepositories!.collegeRepository,
    streamRepository: options.streamRepository ?? defaultKnowledgeRepositories!.streamRepository,
    aidSchemeRepository:
      options.aidSchemeRepository ?? defaultKnowledgeRepositories!.aidSchemeRepository,
    datasetRepository: options.datasetRepository ?? defaultKnowledgeRepositories!.datasetRepository,
    ...((options.catalogImportCoordinator ??
      defaultKnowledgeRepositories?.catalogImportCoordinator) === undefined
      ? {}
      : {
          catalogImportCoordinator:
            options.catalogImportCoordinator ?? defaultKnowledgeRepositories!.catalogImportCoordinator!,
        }),
    authorizeInternalRequest: createInternalAuthorizer(
      options.internalApiKey ?? env.INTERNAL_API_KEY,
    ),
  });

  const openApiDocument = generateOpenApiDocument(registry);
  const swaggerPathOrder = [
    "/api/v1/health",
    "/api/v1/catalog/datasets",
    "/api/v1/catalog/careers/search",
    "/api/v1/catalog/careers/{slug}",
    "/api/v1/catalog/streams",
    "/api/v1/catalog/colleges",
    "/api/v1/catalog/aid-schemes",
    "/api/v1/internal/catalog/imports",
    "/api/v1/internal/catalog/imports/{id}/report",
  ];
  const orderedPaths: typeof openApiDocument.paths = {};
  for (const path of swaggerPathOrder) {
    const pathItem = openApiDocument.paths[path];
    if (pathItem !== undefined) orderedPaths[path] = pathItem;
  }
  for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
    if (orderedPaths[path] === undefined) orderedPaths[path] = pathItem;
  }
  openApiDocument.paths = orderedPaths;
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

const createInternalAuthorizer = (expectedKey: string | undefined) =>
  (authorization: string | undefined): boolean => {
    if (expectedKey === undefined || authorization === undefined) return false;
    const prefix = "Bearer ";
    if (!authorization.startsWith(prefix)) return false;
    const supplied = Buffer.from(authorization.slice(prefix.length));
    const expected = Buffer.from(expectedKey);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  };
