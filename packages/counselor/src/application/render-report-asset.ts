import { randomUUID } from "node:crypto";
import {
  CreateShareCardRequestSchema,
  GeneratedAssetResponseSchema,
  RenderReportAssetRequestSchema,
  UuidSchema,
  type GeneratedAssetResponse,
} from "@yuvanext/contracts";
import { CounselorNotFoundError } from "./errors.js";
import type { CounselorRepository, ReportRenderer } from "./ports/index.js";

export type RenderReportPdfCommand = {
  userId: string;
  reportId: string;
  request: unknown;
};

export type CreateShareCardCommand = {
  userId: string;
  request: unknown;
};

export type RenderReportAssetDependencies = {
  repository: CounselorRepository;
  renderer: ReportRenderer;
  privateAssetTtlMs: number;
  shareAssetTtlMs: number;
  createId?: () => string;
  now?: () => Date;
};

export class RenderReportAssetService {
  constructor(private readonly dependencies: RenderReportAssetDependencies) {}

  async renderPdf(command: RenderReportPdfCommand): Promise<GeneratedAssetResponse> {
    const userId = UuidSchema.parse(command.userId);
    const reportId = UuidSchema.parse(command.reportId);
    const request = RenderReportAssetRequestSchema.parse(command.request);
    return this.render(userId, reportId, request.idempotencyKey, "report_pdf");
  }

  async renderShareCard(command: CreateShareCardCommand): Promise<GeneratedAssetResponse> {
    const userId = UuidSchema.parse(command.userId);
    const request = CreateShareCardRequestSchema.parse(command.request);
    return this.render(userId, request.reportId, request.idempotencyKey, "share_card");
  }

  private async render(
    userId: string,
    reportId: string,
    idempotencyKey: string,
    assetType: "report_pdf" | "share_card",
  ): Promise<GeneratedAssetResponse> {
    const existing = await this.dependencies.repository.findGeneratedAsset(userId, idempotencyKey);
    if (existing) {
      return GeneratedAssetResponseSchema.parse({ asset: existing });
    }
    const report = await this.dependencies.repository.findReport(userId, reportId);
    if (!report) {
      throw new CounselorNotFoundError("Report was not found");
    }

    const rendered =
      assetType === "report_pdf"
        ? await this.dependencies.renderer.renderPdf(report)
        : await this.dependencies.renderer.renderShareCard(report);
    const now = (this.dependencies.now ?? (() => new Date()))();
    const ttlMs =
      assetType === "report_pdf"
        ? this.dependencies.privateAssetTtlMs
        : this.dependencies.shareAssetTtlMs;
    const asset = await this.dependencies.repository.saveGeneratedAsset({
      userId,
      idempotencyKey,
      asset: {
        assetId: (this.dependencies.createId ?? randomUUID)(),
        reportId,
        ...rendered,
        generationStatus: "ready",
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
        createdAt: now.toISOString(),
      },
    });
    return GeneratedAssetResponseSchema.parse({ asset });
  }
}
