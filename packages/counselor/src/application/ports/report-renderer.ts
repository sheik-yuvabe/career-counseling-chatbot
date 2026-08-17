import type { ReportSnapshot } from "@yuvanext/contracts";

export type RenderedReportAsset = {
  assetType: "report_pdf" | "share_card";
  contentHash: string;
  storageBucket: string;
  storagePath: string;
  privacyClass: "private_report" | "share_safe";
};

export interface ReportRenderer {
  renderPdf(report: ReportSnapshot): Promise<RenderedReportAsset>;
  renderShareCard(report: ReportSnapshot): Promise<RenderedReportAsset>;
}
