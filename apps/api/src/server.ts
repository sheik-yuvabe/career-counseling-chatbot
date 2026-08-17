import process from "node:process";
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";

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

const [{ createApp }, { env }] = await Promise.all([
  import("./app/create-app.js"),
  import("./config/env.js"),
]);

const app = createApp();
const displayHost = env.HOST === "0.0.0.0" ? "localhost" : env.HOST;
const server = app.listen(env.PORT, env.HOST, () => {
  process.stdout.write(`YuvaNext API listening on http://${displayHost}:${env.PORT}\n`);
  process.stdout.write(`Swagger UI: http://${displayHost}:${env.PORT}/docs\n`);
});

const shutdown = (signal: string): void => {
  process.stdout.write(`${signal} received; closing HTTP server.\n`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
