import { registerAssessmentRoutes, type AssessmentHttpDependencies } from "@yuvanext/assessment";
import { createOpenApiRegistry, generateOpenApiDocument } from "@yuvanext/contracts";
import { registerCounselorRoutes, type CounselorHttpDependencies } from "@yuvanext/counselor";
import { createDatabasePool } from "@yuvanext/database";
import {
  createPostgresEvaluationRunRepository,
  type EvaluationRunRepository,
  registerEvaluationRoutes,
} from "@yuvanext/evaluation";
import {
  registerRecommendationRoutes,
  type RecommendationHttpDependencies,
} from "@yuvanext/recommendations";
import {
  createPostgresPrivacyJobRepository,
  createPostgresSafetyOperationsRepository,
  type PrivacyJobRepository,
  type ResolveSafetyUserId,
  type SafetyOperationsRepository,
  registerSafetyRoutes,
} from "@yuvanext/safety";
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
  checkDatabase?: () => Promise<boolean>;
  databaseRequired?: boolean;
  assessment?: AssessmentHttpDependencies;
  recommendations?: RecommendationHttpDependencies;
  counselor?: CounselorHttpDependencies;
  database?: boolean;
  evaluationRunRepository?: EvaluationRunRepository;
  privacyJobRepository?: PrivacyJobRepository;
  resolveSafetyUserId?: ResolveSafetyUserId;
  safetyOperationsRepository?: SafetyOperationsRepository;
};

export const createApp = (options: CreateAppOptions = {}): Express => {
  const app = express();
  const registry = createOpenApiRegistry();
  const shouldUseDatabase = options.database ?? env.NODE_ENV !== "test";
  const databasePool =
    env.DATABASE_URL && shouldUseDatabase
      ? createDatabasePool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL })
      : undefined;

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }),
  );
  app.use(express.json({ limit: "1mb" }));

  if (options.logging !== false) {
    app.use(requestLogger);
  }

  registerHealthRoute(
    app,
    registry,
    modules,
    options.checkDatabase,
    options.databaseRequired ?? true,
  );
  registerAssessmentRoutes(app, registry, options.assessment);
  registerRecommendationRoutes(app, registry, options.recommendations);
  registerCounselorRoutes(app, registry, options.counselor);
  const privacyJobRepository =
    options.privacyJobRepository ??
    (databasePool ? createPostgresPrivacyJobRepository(databasePool) : undefined);
  const evaluationRunRepository =
    options.evaluationRunRepository ??
    (databasePool ? createPostgresEvaluationRunRepository(databasePool) : undefined);
  const safetyOperationsRepository =
    options.safetyOperationsRepository ??
    (databasePool ? createPostgresSafetyOperationsRepository(databasePool) : undefined);
  const safetyRouteDependencies =
    privacyJobRepository || safetyOperationsRepository || options.resolveSafetyUserId
      ? {
          ...(privacyJobRepository ? { privacyJobRepository } : {}),
          ...(safetyOperationsRepository ? { safetyOperationsRepository } : {}),
          ...(options.resolveSafetyUserId ? { resolveUserId: options.resolveSafetyUserId } : {}),
        }
      : undefined;

  registerSafetyRoutes(app, registry, safetyRouteDependencies);
  registerEvaluationRoutes(
    app,
    registry,
    evaluationRunRepository ? { evaluationRunRepository } : undefined,
  );

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
