import { createClient } from "@supabase/supabase-js";

export type SupabaseServerClient = ReturnType<typeof createClient>;

export const createSupabaseServerClient = (options: {
  url: string;
  apiKey: string;
  fetch?: typeof fetch;
}): SupabaseServerClient =>
  createClient(options.url, options.apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: createApiKeyCompatibleFetch(options.apiKey, options.fetch),
    },
  });

const createApiKeyCompatibleFetch = (
  apiKey: string,
  baseFetch: typeof fetch = fetch,
): typeof fetch => {
  const isNewApiKey = apiKey.startsWith("sb_secret_") || apiKey.startsWith("sb_publishable_");

  if (!isNewApiKey) {
    return baseFetch;
  }

  return (input, init) => {
    const headers = new Headers(init?.headers);

    if (headers.get("authorization") === `Bearer ${apiKey}`) {
      headers.delete("authorization");
    }

    return baseFetch(input, { ...init, headers });
  };
};
