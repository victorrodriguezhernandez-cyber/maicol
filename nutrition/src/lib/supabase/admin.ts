import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicConfig, serverConfig } from "@/lib/config";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` makes any accidental client-side import a build
 * error. Use this only for the narrow set of operations that must write
 * shared/global catalog rows (e.g. caching an Open Food Facts lookup for
 * every user) — never to serve a user's own data; use lib/supabase/server.ts
 * (anon key + cookies, RLS-checked) for that.
 */
export function createAdminClient() {
  const key = serverConfig.supabaseServiceRoleKey;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — see .env.example.",
    );
  }
  return createSupabaseClient(publicConfig.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
