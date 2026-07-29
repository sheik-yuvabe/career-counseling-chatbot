import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  CollegeListQuerySchema,
  CollegeListResponseSchema,
} from "@yuvanext/contracts";
import type { Express } from "express";
import { getColleges } from "../application/get-colleges.js";
import type { CollegeRepository } from "../domain/college.js";

export type RegisterKnowledgeRoutesDependencies = {
  collegeRepository: CollegeRepository;
};

export function registerKnowledgeRoutes(
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: RegisterKnowledgeRoutesDependencies,
): void {
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

    const body = await getColleges(
      dependencies.collegeRepository,
      parsedQuery.data,
    );
    response.status(200).json(body);
  });
}
