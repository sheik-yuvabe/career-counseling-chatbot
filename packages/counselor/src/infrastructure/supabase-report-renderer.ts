import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ReportSnapshotSchema, type ReportSnapshot } from "@yuvanext/contracts";
import { CounselorDependencyUnavailableError } from "../application/errors.js";
import type { RenderedReportAsset, ReportRenderer } from "../application/index.js";

type UploadResult = { error: { message?: string } | null };

export type AssetStorageClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Uint8Array,
        options: { contentType: string; upsert: boolean },
      ): Promise<UploadResult>;
    };
  };
};

export type SupabaseReportRendererOptions = {
  client: AssetStorageClient;
  privateBucket: string;
  shareBucket: string;
};

const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const wrap = (value: string, width: number): string[] => {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
};

export class SupabaseReportRenderer implements ReportRenderer {
  constructor(private readonly options: SupabaseReportRendererOptions) {}

  async renderPdf(report: ReportSnapshot): Promise<RenderedReportAsset> {
    const parsed = ReportSnapshotSchema.parse(report);
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    let page = document.addPage([595, 842]);
    let y = 790;
    page.drawText("YuvaNext Career Counseling Report", {
      x: 48,
      y,
      size: 18,
      font: bold,
      color: rgb(0.08, 0.2, 0.18),
    });
    y -= 34;
    const content = JSON.stringify(parsed.payload, null, 2);
    for (const line of content.split("\n").flatMap((part) => wrap(part, 88))) {
      if (y < 48) {
        page = document.addPage([595, 842]);
        y = 794;
      }
      page.drawText(line.replace(/[^\x20-\x7E]/g, "?"), { x: 48, y, size: 8, font });
      y -= 11;
    }
    const bytes = await document.save();
    const storagePath = `${parsed.reportId}/report.pdf`;
    await this.upload(this.options.privateBucket, storagePath, bytes, "application/pdf");
    return {
      assetType: "report_pdf",
      contentHash: hash(bytes),
      storageBucket: this.options.privateBucket,
      storagePath,
      privacyClass: "private_report",
    };
  }

  async renderShareCard(report: ReportSnapshot): Promise<RenderedReportAsset> {
    const parsed = ReportSnapshotSchema.parse(report);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f4f7f5"/><rect x="64" y="64" width="12" height="502" fill="#167d68"/><text x="112" y="205" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="#12211d">YuvaNext</text><text x="112" y="286" font-family="Arial,sans-serif" font-size="38" fill="#304a42">Career guidance summary</text><text x="112" y="378" font-family="Arial,sans-serif" font-size="27" fill="#536b64">A private counseling report has been prepared.</text><text x="112" y="516" font-family="Arial,sans-serif" font-size="20" fill="#6f817b">Reference ${escapeXml(parsed.reportId.slice(0, 8))}</text></svg>`;
    const bytes = new TextEncoder().encode(svg);
    const storagePath = `${parsed.reportId}/share-card.svg`;
    await this.upload(this.options.shareBucket, storagePath, bytes, "image/svg+xml");
    return {
      assetType: "share_card",
      contentHash: hash(bytes),
      storageBucket: this.options.shareBucket,
      storagePath,
      privacyClass: "share_safe",
    };
  }

  private async upload(
    bucket: string,
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.options.client.storage
      .from(bucket)
      .upload(path, bytes, { contentType, upsert: true });
    if (error) {
      throw new CounselorDependencyUnavailableError(
        `Report asset storage failed: ${error.message ?? "unknown error"}`,
      );
    }
  }
}
