import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicConfig } from "@/lib/config";

/**
 * Supabase client for Server Components, Route Handlers and Server
 * Actions. Uses the anon key + the caller's cookies, so RLS still applies
 * exactly as it does in the browser — this is *not* a service-role client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no response to write to —
          // fine as long as middleware.ts also refreshes the session.
        }
      },
    },
  });
}
