import type { RequestHandler } from "express";
import { logger } from "../config/logger.js";

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = performance.now();
  response.on("finish", () => {
    logger.info(
      {
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      "HTTP request completed",
    );
  });
  next();
};
