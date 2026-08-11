import {
  ApiErrorSchema,
  AidSchemeListQuerySchema,
  AidSchemeListResponseSchema,
  CatalogImportRequestSchema,
  CatalogImportHeadersSchema,
  CatalogImportResponseSchema,
  CatalogImportReportParamsSchema,
  CareerSearchQuerySchema,
  CareerSearchResponseSchema,
  CareerSlugParamsSchema,
  CareerToolResultSchema,
  CollegeListQuerySchema,
  CollegeListResponseSchema,
  PublishedDatasetListResponseSchema,
  StreamListQuerySchema,
  StreamListResponseSchema,
  UuidSchema,
  type OpenAPIRegistry,
} from "@yuvanext/contracts";
import type { Express } from "express";
import { getCareer } from "../application/get-career.js";
import { getAidSchemes } from "../application/get-aid-schemes.js";
import { getColleges } from "../application/get-colleges.js";
import { getStreams } from "../application/get-streams.js";
import { getPublishedDatasets } from "../application/get-published-datasets.js";
import { searchCareers } from "../application/search-careers.js";
import { getCatalogImportReport, startCatalogImport, type CatalogImportCoordinator } from "../application/start-catalog-import.js";
import { CatalogEntityNotFoundError, type CareerRepository } from "../domain/career.js";
import { InvalidCatalogCursorError, type CareerSearchRepository } from "../domain/career-search.js";
import type { CollegeRepository } from "../domain/college.js";
import type { AidSchemeRepository } from "../domain/aid-scheme.js";
import type { StreamRepository } from "../domain/streams.js";
import type { DatasetRepository } from "../domain/dataset.js";

export type RegisterKnowledgeRoutesDependencies = {
  careerRepository: CareerRepository;
  careerSearchRepository: CareerSearchRepository;
  collegeRepository: CollegeRepository;
  streamRepository: StreamRepository;
  aidSchemeRepository: AidSchemeRepository;
  datasetRepository: DatasetRepository;
  catalogImportCoordinator?: CatalogImportCoordinator;
  authorizeInternalRequest?: (authorization: string | undefined) => boolean;
};

export function registerKnowledgeRoutes(
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: RegisterKnowledgeRoutesDependencies,
): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/internal/catalog/imports/{id}/report",
    tags: ["Knowledge - Internal"],
    summary: "Get an audited catalog import report",
    security: [{ bearerAuth: [] }],
    request: { params: CatalogImportReportParamsSchema },
    responses: {
      200: {
        description: "Audited import result",
        content: { "application/json": { schema: CatalogImportResponseSchema } },
      },
      400: { description: "Invalid import ID", content: { "application/json": { schema: ApiErrorSchema } } },
      401: { description: "Internal service authorization required", content: { "application/json": { schema: ApiErrorSchema } } },
      404: { description: "Import report not found", content: { "application/json": { schema: ApiErrorSchema } } },
      503: { description: "Internal importing is not configured", content: { "application/json": { schema: ApiErrorSchema } } },
    },
  });

  app.get("/api/v1/internal/catalog/imports/:id/report", async (request, response) => {
    if (dependencies.authorizeInternalRequest?.(request.header("authorization")) !== true) {
      response.status(401).json({ code: "UNAUTHORIZED", message: "Internal service authorization is required" });
      return;
    }
    const params = CatalogImportReportParamsSchema.safeParse(request.params);
    if (!params.success) {
      response.status(400).json({ code: "INVALID_IMPORT_ID", message: "Import ID must be a UUID" });
      return;
    }
    if (dependencies.catalogImportCoordinator === undefined) {
      response.status(503).json({ code: "IMPORT_NOT_CONFIGURED", message: "Catalog importing is not configured" });
      return;
    }
    const report = await getCatalogImportReport(
      dependencies.catalogImportCoordinator,
      params.data.id,
    );
    if (report === null) {
      response.status(404).json({ code: "IMPORT_REPORT_NOT_FOUND", message: "Catalog import report was not found" });
      return;
    }
    response.status(200).json(report);
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/internal/catalog/imports",
    tags: ["Knowledge - Internal"],
    summary: "Import an allowlisted reviewed catalog dataset",
    security: [{ bearerAuth: [] }],
    request: {
      headers: CatalogImportHeadersSchema,
      body: {
        required: true,
        content: { "application/json": { schema: CatalogImportRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Dataset import completed or was already published",
        content: { "application/json": { schema: CatalogImportResponseSchema } },
      },
      400: { description: "Invalid import request", content: { "application/json": { schema: ApiErrorSchema } } },
      401: { description: "Internal service authorization required", content: { "application/json": { schema: ApiErrorSchema } } },
      503: { description: "Internal importing is not configured", content: { "application/json": { schema: ApiErrorSchema } } },
    },
  });

  app.post("/api/v1/internal/catalog/imports", async (request, response) => {
    const authorization = request.header("authorization");
    if (dependencies.authorizeInternalRequest?.(authorization) !== true) {
      response.status(401).json({ code: "UNAUTHORIZED", message: "Internal service authorization is required" });
      return;
    }
    const importId = request.header("idempotency-key");
    const parsedImportId = UuidSchema.safeParse(importId);
    const parsedBody = CatalogImportRequestSchema.safeParse(request.body);
    if (!parsedImportId.success || !parsedBody.success) {
      response.status(400).json({ code: "INVALID_IMPORT_REQUEST", message: "A UUID idempotency key and allowlisted dataset key are required" });
      return;
    }
    if (dependencies.catalogImportCoordinator === undefined) {
      response.status(503).json({ code: "IMPORT_NOT_CONFIGURED", message: "Catalog importing is not configured" });
      return;
    }
    response.status(200).json(await startCatalogImport(
      dependencies.catalogImportCoordinator,
      parsedBody.data,
      parsedImportId.data,
    ));
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/datasets",
    tags: ["Knowledge"],
    summary: "List published catalog datasets",
    responses: {
      200: {
        description: "Published dataset versions and source provenance",
        content: {
          "application/json": { schema: PublishedDatasetListResponseSchema },
        },
      },
    },
  });

  app.get("/api/v1/catalog/datasets", async (_request, response) => {
    response.status(200).json(
      await getPublishedDatasets(dependencies.datasetRepository),
    );
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/aid-schemes",
    tags: ["Knowledge"],
    summary: "List verified financial-aid schemes",
    request: { query: AidSchemeListQuerySchema },
    responses: {
      200: {
        description: "Verified aid schemes matching the supplied filters",
        content: { "application/json": { schema: AidSchemeListResponseSchema } },
      },
      400: {
        description: "Invalid aid-scheme filters",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/catalog/aid-schemes", async (request, response) => {
    const query = AidSchemeListQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({
        code: "INVALID_CATALOG_QUERY",
        message: "Aid scheme query parameters are invalid",
      });
      return;
    }
    response.status(200).json(
      await getAidSchemes(dependencies.aidSchemeRepository, query.data),
    );
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/colleges",
    tags: ["Knowledge"],
    summary: "List verified colleges",
    request: {
      query: CollegeListQuerySchema,
    },
    responses: {
      200: {
        description: "Verified colleges matching the supplied filters",
        content: {
          "application/json": { schema: CollegeListResponseSchema },
        },
      },
      400: {
        description: "Invalid college filters",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/catalog/colleges", async (request, response) => {
    const parsedQuery = CollegeListQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      const body = {
        code: "INVALID_CATALOG_QUERY",
        message: "College query parameters are invalid",
      };
      response.status(400).json(body);
      return;
    }

    const body = await getColleges(dependencies.collegeRepository, parsedQuery.data);
    response.status(200).json(body);
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/streams",
    tags: ["Knowledge"],
    summary: "Get approved stream mappings",
    request: {
      query: StreamListQuerySchema,
    },
    responses: {
      200: {
        description: "Ordered approved stream options",
        content: {
          "application/json": { schema: StreamListResponseSchema },
        },
      },
      400: {
        description: "Invalid RIASEC or segment query",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/catalog/streams", async (request, response) => {
    const parsedQuery = StreamListQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      response.status(400).json({
        code: "INVALID_CATALOG_QUERY",
        message: "Stream query parameters are invalid",
      });
      return;
    }

    const body = await getStreams(
      dependencies.streamRepository,
      parsedQuery.data,
    );
    response.status(200).json(body);
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/careers/search",
    tags: ["Knowledge"],
    summary: "Search published careers",
    request: {
      query: CareerSearchQuerySchema,
    },
    responses: {
      200: {
        description: "A bounded page of published career summaries",
        content: {
          "application/json": { schema: CareerSearchResponseSchema },
        },
      },
      400: {
        description: "Invalid search filters or cursor",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/catalog/careers/search", async (request, response) => {
    const parsedQuery = CareerSearchQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      response.status(400).json({
        code: "INVALID_CATALOG_QUERY",
        message: "Career search parameters are invalid",
      });
      return;
    }

    try {
      const body = await searchCareers(dependencies.careerSearchRepository, parsedQuery.data);
      response.status(200).json(body);
    } catch (error) {
      if (error instanceof InvalidCatalogCursorError) {
        response.status(400).json({
          code: error.code,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/careers/{slug}",
    tags: ["Knowledge"],
    summary: "Get a published career",
    request: {
      params: CareerSlugParamsSchema,
    },
    responses: {
      200: {
        description: "Published career with approved details",
        content: {
          "application/json": { schema: CareerToolResultSchema },
        },
      },
      400: {
        description: "Invalid career slug",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Career is not in the published catalog",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get("/api/v1/catalog/careers/:slug", async (request, response) => {
    const parsedParams = CareerSlugParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      response.status(400).json({
        code: "INVALID_CATALOG_QUERY",
        message: "Career slug is invalid",
      });
      return;
    }

    try {
      const body = await getCareer(dependencies.careerRepository, parsedParams.data.slug);
      response.status(200).json(body);
    } catch (error) {
      if (error instanceof CatalogEntityNotFoundError) {
        response.status(404).json({
          code: error.code,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  });
}
