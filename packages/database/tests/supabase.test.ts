import { describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "../src/supabase.js";

describe("createSupabaseServerClient", () => {
  it("does not send a new-format API key as a bearer token to Storage", async () => {
    const request = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ Id: "asset-id", Key: "reports/report.pdf" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const apiKey = "sb_secret_test-key";
    const client = createSupabaseServerClient({
      url: "https://example.supabase.co",
      apiKey,
      fetch: request,
    });

    const { error } = await client.storage
      .from("private-reports")
      .upload("reports/report.pdf", new Uint8Array([1, 2, 3]));

    expect(error).toBeNull();
    expect(request).toHaveBeenCalledOnce();
    const init = request.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe(apiKey);
    expect(headers.get("authorization")).toBeNull();
  });
});
