import { UuidSchema } from "@yuvanext/contracts";
import type { ResolveCounselorUserId } from "@yuvanext/counselor";

export type SupabaseAuthClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
};

const readBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
};

export const createSupabaseUserResolver = (client: SupabaseAuthClient): ResolveCounselorUserId => {
  return async (request) => {
    const accessToken = readBearerToken(request.header("authorization"));
    if (!accessToken) {
      return null;
    }

    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    const userId = UuidSchema.safeParse(data.user.id);
    return userId.success ? userId.data : null;
  };
};
