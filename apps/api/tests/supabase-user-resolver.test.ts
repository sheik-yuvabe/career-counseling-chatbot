import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseUserResolver,
  type SupabaseAuthClient,
} from "../src/auth/supabase-user-resolver.js";

const userId = "00000000-0000-4000-8000-000000000400";

const requestWithAuthorization = (authorization?: string): Request =>
  ({
    header: vi.fn(() => authorization),
  }) as unknown as Request;

describe("createSupabaseUserResolver", () => {
  it("resolves a valid bearer token to the authenticated UUID", async () => {
    const getUser = vi.fn(() =>
      Promise.resolve({
        data: { user: { id: userId } },
        error: null,
      }),
    );
    const resolveUserId = createSupabaseUserResolver({
      auth: { getUser },
    });

    await expect(resolveUserId(requestWithAuthorization("Bearer valid-token"))).resolves.toBe(
      userId,
    );
    expect(getUser).toHaveBeenCalledWith("valid-token");
  });

  it.each([undefined, "", "Basic credentials", "Bearer"])(
    "rejects a missing or malformed authorization header",
    async (authorization) => {
      const getUser = vi.fn();
      const client = { auth: { getUser } } as unknown as SupabaseAuthClient;
      const resolveUserId = createSupabaseUserResolver(client);

      await expect(resolveUserId(requestWithAuthorization(authorization))).resolves.toBeNull();
      expect(getUser).not.toHaveBeenCalled();
    },
  );

  it("rejects Supabase errors and invalid user IDs", async () => {
    const errorClient: SupabaseAuthClient = {
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: null },
            error: new Error("synthetic auth failure"),
          }),
      },
    };
    const invalidIdClient: SupabaseAuthClient = {
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: "not-a-uuid" } },
            error: null,
          }),
      },
    };

    await expect(
      createSupabaseUserResolver(errorClient)(requestWithAuthorization("Bearer token")),
    ).resolves.toBeNull();
    await expect(
      createSupabaseUserResolver(invalidIdClient)(requestWithAuthorization("Bearer token")),
    ).resolves.toBeNull();
  });
});
