import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export type { OpenAPIRegistry };

export const createOpenApiRegistry = (): OpenAPIRegistry => new OpenAPIRegistry();

export type OpenApiDocument = ReturnType<OpenApiGeneratorV3["generateDocument"]>;

export const generateOpenApiDocument = (registry: OpenAPIRegistry): OpenApiDocument =>
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "YuvaNext Backend API",
      version: "0.1.0",
      description: "Shared Phase A backend API for all five YuvaNext modules.",
    },
    servers: [{ url: "/", description: "Current server" }],
  });
