import process from "node:process";
import { resolve } from "node:path";

try {
  process.loadEnvFile(
    resolve(process.env.INIT_CWD ?? process.cwd(), ".env"),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}

const [{ createApp }, { env }] = await Promise.all([
  import("./app/create-app.js"),
  import("./config/env.js"),
]);

const app = createApp();
const server = app.listen(env.PORT, () => {
  process.stdout.write(`YuvaNext API listening on http://localhost:${env.PORT}\n`);
  process.stdout.write(`Swagger UI: http://localhost:${env.PORT}/docs\n`);
});

const shutdown = (signal: string): void => {
  process.stdout.write(`${signal} received; closing HTTP server.\n`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
