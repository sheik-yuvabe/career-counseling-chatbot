import type { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "../config/logger.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    code: "route_not_found",
    message: `No route for ${request.method} ${request.path}`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  void _next;
  logger.error(
    { err: error, method: request.method, path: request.path },
    "Unhandled request error",
  );
  response.status(500).json({
    code: "internal_error",
    message: "The server could not complete the request.",
  });
};
