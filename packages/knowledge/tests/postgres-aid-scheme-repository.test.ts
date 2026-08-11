import { describe, expect, it, vi } from "vitest";
import { PostgresAidSchemeRepository } from "../src/index.js";

describe("PostgresAidSchemeRepository", () => {
  it("selects one published dataset before listing verified schemes", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresAidSchemeRepository({ query });

    await repository.list({ state: "Tamil Nadu", limit: 20 });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("with selected_dataset as"), [
      "Tamil Nadu",
      null,
      null,
      null,
      20,
    ]);
    expect(query.mock.calls[0]?.[0]).toContain("join selected_dataset");
    expect(query.mock.calls[0]?.[0]).toContain("when 'authoritative_external' then 0");
  });

  it("caps database results at fifty records", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresAidSchemeRepository({ query });

    await repository.list({ limit: 500 });

    expect(query.mock.calls[0]?.[1]).toEqual([null, null, null, null, 50]);
  });
});
