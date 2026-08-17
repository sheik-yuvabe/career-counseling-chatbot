import { ReportSnapshotSchema, type ReportSnapshot } from "@yuvanext/contracts";
import type { RenderedReportAsset, ReportRenderer } from "../../application/index.js";

export class FixtureReportRenderer implements ReportRenderer {
  renderPdf(report: ReportSnapshot): Promise<RenderedReportAsset> {
    const parsed = ReportSnapshotSchema.parse(report);
    return Promise.resolve({
      assetType: "report_pdf",
      contentHash: `fixture-pdf:${parsed.payloadHash}`,
      storageBucket: "synthetic-private-reports",
      storagePath: `${parsed.reportId}/report.pdf`,
      privacyClass: "private_report",
    });
  }

  renderShareCard(report: ReportSnapshot): Promise<RenderedReportAsset> {
    const parsed = ReportSnapshotSchema.parse(report);
    return Promise.resolve({
      assetType: "share_card",
      contentHash: `fixture-share:${parsed.payloadHash}`,
      storageBucket: "synthetic-share-cards",
      storagePath: `${parsed.reportId}/share-card.png`,
      privacyClass: "share_safe",
    });
  }
}
