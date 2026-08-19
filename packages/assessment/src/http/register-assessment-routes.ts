import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ApiErrorSchema,
  ProfileSnapshotResponseSchema,
  UuidSchema,
  type ProfileSnapshotResponse,
} from "@yuvanext/contracts";
import { z } from "zod";
import type { Express, NextFunction, Request, Response } from "express";
import {
  AssessmentProfileNotFoundError,
  type GetProfileSnapshotCommand,
} from "../application/get-profile-snapshot.js";

const ProfileSnapshotQuerySchema = z
  .object({
    profileSnapshotId: UuidSchema.optional(),
  })
  .strict();

export type AssessmentProfileService = {
  execute(command: GetProfileSnapshotCommand): Promise<ProfileSnapshotResponse>;
};

export type ResolveAssessmentUserId = (request: Request) => Promise<string | null>;

export type AssessmentHttpDependencies = {
  getProfileSnapshot?: AssessmentProfileService;
  resolveUserId?: ResolveAssessmentUserId;
};

const sendError = (response: Response, status: number, code: string, message: string): void => {
  response.status(status).json({ code, message });
};

export const registerAssessmentRoutes = (
  app: Express,
  registry: OpenAPIRegistry,
  dependencies: AssessmentHttpDependencies = {},
): void => {
  registry.registerPath({
    method: "get",
    path: "/api/v1/profile/snapshot",
    tags: ["Assessment"],
    summary: "Get an authenticated user's profile snapshot",
    security: [{ bearerAuth: [] }],
    request: {
      query: ProfileSnapshotQuerySchema,
    },
    responses: {
      200: {
        description: "Owned profile snapshot, or the latest snapshot when no ID is supplied",
        content: { "application/json": { schema: ProfileSnapshotResponseSchema } },
      },
      400: {
        description: "Invalid profile snapshot ID",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      404: {
        description: "Profile snapshot not found",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
      503: {
        description: "Assessment profile service unavailable",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });

  app.get(
    "/api/v1/profile/snapshot",
    async (request: Request, response: Response, next: NextFunction) => {
      if (!dependencies.getProfileSnapshot || !dependencies.resolveUserId) {
        sendError(
          response,
          503,
          "assessment_unavailable",
          "The assessment profile service is not configured.",
        );
        return;
      }
      const query = ProfileSnapshotQuerySchema.safeParse(request.query);
      if (!query.success) {
        sendError(response, 400, "invalid_request", "The profile snapshot ID is invalid.");
        return;
      }
      try {
        const userId = await dependencies.resolveUserId(request);
        if (!userId) {
          sendError(response, 401, "authentication_required", "A valid bearer token is required.");
          return;
        }
        response.status(200).json(
          ProfileSnapshotResponseSchema.parse(
            await dependencies.getProfileSnapshot.execute({
              userId,
              ...(query.data.profileSnapshotId
                ? { profileSnapshotId: query.data.profileSnapshotId }
                : {}),
            }),
          ),
        );
      } catch (error) {
        if (error instanceof AssessmentProfileNotFoundError) {
          sendError(response, 404, "profile_not_found", error.message);
          return;
        }
        next(error);
      }
    },
  );
};
