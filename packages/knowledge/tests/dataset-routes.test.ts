import {
  createOpenApiRegistry,
  CatalogImportResponseSchema,
  PublishedDatasetListResponseSchema,
  PublishedDatasetSchema,
} from "@yuvanext/contracts";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  InMemoryAidSchemeRepository,
  InMemoryCareerRepository,
  InMemoryCareerSearchRepository,
  InMemoryCollegeRepository,
  InMemoryDatasetRepository,
  InMemoryStreamRepository,
  registerKnowledgeRoutes,
} from "../src/index.js";

const dataset = PublishedDatasetSchema.parse({
  id: "d2222222-2222-4222-8222-222222222223",
  datasetKey: "aid-schemes-poc",
  version: "2026-08-02",
  checksumSha256: "9d546c0d6e4930dfa804d8daa8b7785f650e144e1fe1b97ba3cd8e706fe1e887",
  recordCount: 3,
  publishedAt: "2026-08-03T00:00:00.000Z",
  source: {
    sourceKey: "yuvanext-synthetic-aid-poc",
    name: "YuvaNext synthetic aid fixtures",
    publisher: "YuvaNext POC team",
    trustLevel: "project_reviewed",
  },
});

describe("dataset routes", () => {
  it("lists published dataset metadata and provenance", async () => {
    const app = express();
    registerKnowledgeRoutes(app, createOpenApiRegistry(), {
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([dataset]),
      streamRepository: new InMemoryStreamRepository([], [], []),
    });

    const response = await request(app)
      .get("/api/v1/catalog/datasets")
      .expect(200);
    const body = PublishedDatasetListResponseSchema.parse(response.body);
    expect(body.data).toEqual([dataset]);
  });

  it("requires service authorization for an import", async () => {
    const app = express();
    app.use(express.json());
    registerKnowledgeRoutes(app, createOpenApiRegistry(), {
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([]),
      streamRepository: new InMemoryStreamRepository([], [], []),
      authorizeInternalRequest: () => false,
    });
    await request(app)
      .post("/api/v1/internal/catalog/imports")
      .send({ datasetKey: "aid-schemes-poc" })
      .expect(401);
  });

  it("starts an allowlisted idempotent import", async () => {
    const app = express();
    app.use(express.json());
    const importId = "e1111111-1111-4111-8111-111111111111";
    registerKnowledgeRoutes(app, createOpenApiRegistry(), {
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([]),
      streamRepository: new InMemoryStreamRepository([], [], []),
      authorizeInternalRequest: (authorization) => authorization === "Bearer test-key",
      catalogImportCoordinator: {
        start: (body, receivedId) => Promise.resolve({
          importId: receivedId,
          datasetKey: body.datasetKey,
          status: "already_published",
          datasetVersionId: "d2222222-2222-4222-8222-222222222223",
          version: "2026-08-02",
          recordCount: 3,
          checksumSha256: "9d546c0d6e4930dfa804d8daa8b7785f650e144e1fe1b97ba3cd8e706fe1e887",
          issues: [],
        }),
        getReport: () => Promise.resolve(null),
      },
    });
    const response = await request(app)
      .post("/api/v1/internal/catalog/imports")
      .set("authorization", "Bearer test-key")
      .set("idempotency-key", importId)
      .send({ datasetKey: "aid-schemes-poc" })
      .expect(200);
    const body = CatalogImportResponseSchema.parse(response.body);
    expect(body.importId).toBe(importId);
    expect(body.status).toBe("already_published");
  });

  it("returns an authorized audited import report", async () => {
    const app = express();
    const importId = "e1111111-1111-4111-8111-111111111111";
    const report = CatalogImportResponseSchema.parse({
      importId,
      datasetKey: "aid-schemes-poc",
      status: "published",
      datasetVersionId: "d2222222-2222-4222-8222-222222222223",
      version: "2026-08-02",
      recordCount: 3,
      checksumSha256: "9d546c0d6e4930dfa804d8daa8b7785f650e144e1fe1b97ba3cd8e706fe1e887",
      issues: [],
    });
    registerKnowledgeRoutes(app, createOpenApiRegistry(), {
      aidSchemeRepository: new InMemoryAidSchemeRepository([]),
      careerRepository: new InMemoryCareerRepository([]),
      careerSearchRepository: new InMemoryCareerSearchRepository([]),
      collegeRepository: new InMemoryCollegeRepository([]),
      datasetRepository: new InMemoryDatasetRepository([]),
      streamRepository: new InMemoryStreamRepository([], [], []),
      authorizeInternalRequest: (authorization) => authorization === "Bearer test-key",
      catalogImportCoordinator: {
        start: () => Promise.resolve(report),
        getReport: (receivedId) => Promise.resolve(
          receivedId === importId ? report : null,
        ),
      },
    });

    const response = await request(app)
      .get(`/api/v1/internal/catalog/imports/${importId}/report`)
      .set("authorization", "Bearer test-key")
      .expect(200);
    expect(CatalogImportResponseSchema.parse(response.body)).toEqual(report);

    await request(app)
      .get("/api/v1/internal/catalog/imports/e2222222-2222-4222-8222-222222222222/report")
      .set("authorization", "Bearer test-key")
      .expect(404);

    await request(app)
      .get(`/api/v1/internal/catalog/imports/${importId}/report`)
      .expect(401);
  });
});
