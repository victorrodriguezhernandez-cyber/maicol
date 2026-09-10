import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/config";

/**
 * Supabase client for Server Components, Route Handlers and Server
 * Actions. Uses the anon key + the caller's cookies, so RLS still applies
 * exactly as it does in the browser — this is *not* a service-role client.
 *
 * Wrapped in React's `cache()` so every Server Component in one request
 * (the app layout, the page, any nested components) shares the exact same
 * client instance instead of each re-reading cookies and building its own
 * — a prerequisite for `getUser` below to actually dedupe anything.
 */
export const createClient = cache(async () => {
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
          // fine as long as proxy.ts also refreshes the session.
        }
      },
    },
  });
});

/**
 * `supabase.auth.getUser()` deliberately re-validates the session against
 * the Supabase Auth server on every call (it never trusts a locally
 * decoded JWT) — that's a real network round trip. Both the app layout
 * and every page under it call this to get `user.id`, so an unmemoized
 * page load was firing 3-4 of these in a row (confirmed in the Supabase
 * logs). Memoized per-request: one request now does the check once.
 *
 * `proxy.ts` already runs this exact check on every request (it has to,
 * to decide the /login redirect) and forwards the validated id/email as
 * trusted `x-maicol-user-*` request headers — see the comment there for
 * why the client can't spoof them. Reusing that here skips a SECOND,
 * fully redundant network round trip to Supabase's Auth server on every
 * navigation. This only ever shortcuts *reading* who the user is: it
 * never becomes the authorization boundary — every DB query this `user`
 * feeds into is still scoped by RLS via the real cookie-borne JWT
 * regardless. If the header is ever missing (a code path proxy.ts
 * doesn't cover), this falls back to the real network check, same as
 * before.
 */
export const getUser = cache(
  async (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ): Promise<{ data: { user: User | null }; error: AuthError | null }> => {
    const h = await headers();
    const id = h.get("x-maicol-user-id");
    if (id) {
      const email = h.get("x-maicol-user-email") || undefined;
      return { data: { user: { id, email } as unknown as User }, error: null };
    }
    return supabase.auth.getUser();
  },
);
