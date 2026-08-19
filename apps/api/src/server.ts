import process from "node:process";
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { createAssessmentFixtureRuntime } from "./app/create-assessment-fixture-runtime.js";
import { createAssessmentRuntime } from "./app/create-assessment-runtime.js";
import { createCounselorFixtureRuntime } from "./app/create-counselor-fixture-runtime.js";
import { createCounselorRuntime } from "./app/create-counselor-runtime.js";
import { createRecommendationFixtureRuntime } from "./app/create-recommendation-fixture-runtime.js";
import { createRecommendationRuntime } from "./app/create-recommendation-runtime.js";
import { createSupabaseUserResolver } from "./auth/supabase-user-resolver.js";

const loadNearestEnvFile = (): void => {
  let directory = process.cwd();
  const root = parse(directory).root;

  while (true) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }

    if (directory === root) {
      return;
    }

    directory = dirname(directory);
  }
};

loadNearestEnvFile();

const [{ createApp }, { env }, { createDatabasePool, createSupabaseServerClient }] =
  await Promise.all([
    import("./app/create-app.js"),
    import("./config/env.js"),
    import("@yuvanext/database"),
  ]);

const fixtureMode = env.COUNSELOR_RUNTIME === "fixture";
if (fixtureMode && env.NODE_ENV === "production") {
  throw new Error("COUNSELOR_RUNTIME=fixture is forbidden in production");
}

const databasePool =
  !fixtureMode && env.DATABASE_URL
    ? createDatabasePool({
        connectionString: env.DATABASE_URL,
        ssl: env.DATABASE_SSL,
        connectionTimeoutMillis: 10_000,
      })
    : null;
const supabase =
  !fixtureMode && env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createSupabaseServerClient({
        url: env.SUPABASE_URL,
        apiKey: env.SUPABASE_ANON_KEY,
      })
    : null;
const supabaseService =
  !fixtureMode && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServerClient({
        url: env.SUPABASE_URL,
        apiKey: env.SUPABASE_SERVICE_ROLE_KEY,
      })
    : null;
const counselor = fixtureMode
  ? createCounselorFixtureRuntime(env.COUNSELOR_FIXTURE_TOKEN)
  : databasePool && supabase && supabaseService
    ? await (async () => {
        const [
          assessmentPackage,
          recommendationPackage,
          knowledgePackage,
          counselorPackage,
          safetyPackage,
        ] =
          await Promise.all([
            import("@yuvanext/assessment"),
            import("@yuvanext/recommendations"),
            import("@yuvanext/knowledge"),
            import("@yuvanext/counselor"),
            import("@yuvanext/safety"),
          ]);
        const geminiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL);
        const anthropicConfigured = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL);
        const selectedAiProvider =
          env.AI_PROVIDER === "auto"
            ? geminiConfigured
              ? "gemini"
              : anthropicConfigured
                ? "anthropic"
                : "disabled"
            : env.AI_PROVIDER;
        const aiConfigured =
          (selectedAiProvider === "gemini" && geminiConfigured) ||
          (selectedAiProvider === "anthropic" && anthropicConfigured);
        const safetyConfigured = Boolean(env.SAFETY_SERVICE_URL);
        return createCounselorRuntime({
          databasePool,
          supabaseAuth: supabase,
          profiles: new assessmentPackage.PostgresProfileSnapshotReader(databasePool),
          recommendations: new recommendationPackage.PostgresRecommendationSetReader(databasePool),
          knowledge: new knowledgePackage.PostgresKnowledgeReader(databasePool),
          safety: safetyConfigured
            ? new counselorPackage.HttpSafetyChecker({
                baseUrl: env.SAFETY_SERVICE_URL!,
                timeoutMs: env.SAFETY_SERVICE_TIMEOUT_MS,
              })
            : new counselorPackage.UnavailableSafetyChecker(),
          ai:
            selectedAiProvider === "gemini" && geminiConfigured
              ? new counselorPackage.GeminiAiProvider({
                  apiKey: env.GEMINI_API_KEY!,
                  model: env.GEMINI_MODEL!,
                  maxTokens: env.GEMINI_MAX_TOKENS,
                  timeoutMs: env.GEMINI_TIMEOUT_MS,
                  thinkingLevel: env.GEMINI_THINKING_LEVEL,
                })
              : selectedAiProvider === "anthropic" && anthropicConfigured
                ? new counselorPackage.AnthropicAiProvider({
                    apiKey: env.ANTHROPIC_API_KEY!,
                    model: env.ANTHROPIC_MODEL!,
                    maxTokens: env.ANTHROPIC_MAX_TOKENS,
                    timeoutMs: env.ANTHROPIC_TIMEOUT_MS,
                  })
                : new counselorPackage.DisabledAiProvider(),
          approvedCopy: new counselorPackage.ConfiguredApprovedCopyReader({
            version: env.COUNSELOR_COPY_VERSION,
            welcomeBySegment: {
              explorer: env.COUNSELOR_WELCOME_EXPLORER,
              pathfinder: env.COUNSELOR_WELCOME_PATHFINDER,
              launcher: env.COUNSELOR_WELCOME_LAUNCHER,
            },
            fallback: env.COUNSELOR_FALLBACK_COPY,
            safety: new safetyPackage.PostgresApprovedSafetyCopyReader(databasePool),
          }),
          reportRenderer: new counselorPackage.SupabaseReportRenderer({
            client: supabaseService,
            privateBucket: env.COUNSELOR_PRIVATE_REPORT_BUCKET,
            shareBucket: env.COUNSELOR_SHARE_CARD_BUCKET,
          }),
          privateAssetTtlMs: env.COUNSELOR_PRIVATE_ASSET_TTL_MS,
          shareAssetTtlMs: env.COUNSELOR_SHARE_ASSET_TTL_MS,
          aiMode: aiConfigured ? "enabled" : "degraded",
        });
      })()
    : undefined;
const assessment = fixtureMode
  ? createAssessmentFixtureRuntime(env.COUNSELOR_FIXTURE_TOKEN)
  : databasePool && supabase
    ? createAssessmentRuntime(databasePool, supabase)
    : undefined;
const recommendations = fixtureMode
  ? createRecommendationFixtureRuntime(env.COUNSELOR_FIXTURE_TOKEN)
  : databasePool && supabase
    ? createRecommendationRuntime(databasePool, supabase)
    : undefined;
const app = createApp({
  database: false,
  ...(fixtureMode ? { databaseRequired: false } : {}),
  ...(databasePool
    ? {
        checkDatabase: async () => {
          await databasePool.query("select 1");
          return true;
        },
      }
    : {}),
  ...(counselor ? { counselor } : {}),
  ...(assessment ? { assessment } : {}),
  ...(recommendations ? { recommendations } : {}),
  ...(supabase ? { resolveSafetyUserId: createSupabaseUserResolver(supabase) } : {}),
  ...(databasePool
    ? await (async () => {
        const [evaluationPackage, safetyPackage] = await Promise.all([
          import("@yuvanext/evaluation"),
          import("@yuvanext/safety"),
        ]);
        return {
          evaluationRunRepository:
            evaluationPackage.createPostgresEvaluationRunRepository(databasePool),
          privacyJobRepository: safetyPackage.createPostgresPrivacyJobRepository(databasePool),
          safetyOperationsRepository:
            safetyPackage.createPostgresSafetyOperationsRepository(databasePool),
        };
      })()
    : {}),
});
const displayHost = env.HOST === "0.0.0.0" ? "localhost" : env.HOST;
const server = app.listen(env.PORT, env.HOST, () => {
  process.stdout.write(`YuvaNext API listening on http://${displayHost}:${env.PORT}\n`);
  process.stdout.write(`Swagger UI: http://${displayHost}:${env.PORT}/docs\n`);
});

const shutdown = (signal: string): void => {
  process.stdout.write(`${signal} received; closing HTTP server.\n`);
  server.close(() => {
    if (!databasePool) {
      process.exit(0);
    }
    void databasePool.end().finally(() => process.exit(0));
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
