import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COUNSELOR_RUNTIME: z.enum(["unconfigured", "fixture", "integrated"]).default("unconfigured"),
  COUNSELOR_FIXTURE_TOKEN: z.string().min(1).default("fixture-token"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(["auto", "anthropic", "gemini", "disabled"]).default("auto"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(700),
  ANTHROPIC_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  GEMINI_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(700),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  GEMINI_THINKING_LEVEL: z.enum(["minimal", "low", "medium", "high"]).default("minimal"),
  SAFETY_SERVICE_URL: z.string().url().optional(),
  SAFETY_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  COUNSELOR_COPY_VERSION: z.string().min(1).default("1"),
  COUNSELOR_WELCOME_EXPLORER: z
    .string()
    .min(1)
    .default("Welcome. I can help you explore your saved career profile and options."),
  COUNSELOR_WELCOME_PATHFINDER: z
    .string()
    .min(1)
    .default("Welcome. I can help you understand your saved recommendations and next steps."),
  COUNSELOR_WELCOME_LAUNCHER: z
    .string()
    .min(1)
    .default("Welcome. I can help you review your saved career plan and practical next steps."),
  COUNSELOR_FALLBACK_COPY: z
    .string()
    .min(1)
    .default(
      "The AI counselor is temporarily unavailable. You can continue exploring your saved recommendations.",
    ),
  COUNSELOR_PRIVATE_REPORT_BUCKET: z.string().min(1).default("private-reports"),
  COUNSELOR_SHARE_CARD_BUCKET: z.string().min(1).default("share-cards"),
  COUNSELOR_PRIVATE_ASSET_TTL_MS: z.coerce.number().int().positive().default(900_000),
  COUNSELOR_SHARE_ASSET_TTL_MS: z.coerce.number().int().positive().default(86_400_000),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type AppEnv = z.infer<typeof EnvSchema>;
export const env: AppEnv = EnvSchema.parse(process.env);
