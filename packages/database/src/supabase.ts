import { createClient } from "@supabase/supabase-js";

export type SupabaseServerClient = ReturnType<typeof createClient>;

export const createSupabaseServerClient = (options: {
  url: string;
  serviceRoleKey: string;
}): SupabaseServerClient =>
  createClient(options.url, options.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
