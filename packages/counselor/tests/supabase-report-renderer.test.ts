import { validReportSnapshot } from "@yuvanext/test-fixtures";
import { describe, expect, it, vi } from "vitest";
import { SupabaseReportRenderer, type AssetStorageClient } from "../src/index.js";

describe("SupabaseReportRenderer", () => {
  it("uploads a valid private PDF and a profile-minimized share card", async () => {
    const uploads: Array<{ bucket: string; path: string; bytes: Uint8Array; contentType: string }> =
      [];
    const client: AssetStorageClient = {
      storage: {
        from: (bucket) => ({
          upload: (path, bytes, options) => {
            uploads.push({ bucket, path, bytes, contentType: options.contentType });
            return Promise.resolve({ error: null });
          },
        }),
      },
    };
    const renderer = new SupabaseReportRenderer({
      client,
      privateBucket: "private-reports",
      shareBucket: "share-cards",
    });

    const pdf = await renderer.renderPdf(validReportSnapshot);
    const share = await renderer.renderShareCard(validReportSnapshot);

    expect(pdf).toMatchObject({
      assetType: "report_pdf",
      storageBucket: "private-reports",
      privacyClass: "private_report",
    });
    expect(share).toMatchObject({
      assetType: "share_card",
      storageBucket: "share-cards",
      privacyClass: "share_safe",
    });
    expect(new TextDecoder().decode(uploads[0]?.bytes.slice(0, 4))).toBe("%PDF");
    const shareText = new TextDecoder().decode(uploads[1]?.bytes);
    expect(shareText).toContain("Career guidance summary");
    expect(shareText).not.toContain("Synthetic City");
    expect(shareText).not.toContain("16-18");
    expect(uploads.map(({ contentType }) => contentType)).toEqual([
      "application/pdf",
      "image/svg+xml",
    ]);
  });

  it("surfaces storage failure without writing asset metadata", async () => {
    const upload = vi.fn(() => Promise.resolve({ error: { message: "bucket missing" } }));
    const renderer = new SupabaseReportRenderer({
      client: { storage: { from: () => ({ upload }) } },
      privateBucket: "private-reports",
      shareBucket: "share-cards",
    });

    await expect(renderer.renderPdf(validReportSnapshot)).rejects.toThrow(
      "Report asset storage failed",
    );
  });
});
