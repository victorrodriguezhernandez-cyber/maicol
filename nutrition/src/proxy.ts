import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicConfig } from "@/lib/config";

/**
 * Refreshes the Supabase auth session on every request, per the
 * @supabase/ssr contract — without this, sessions silently expire.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicConfig.supabaseUrl,
    publicConfig.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isAuthRoute && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user) {
    // `auth.getUser()` above already re-validated the session against
    // Supabase's Auth server — a real network round trip. Every page
    // under (app) used to repeat that exact same call on its own
    // (`getUser()` in lib/supabase/server.ts), paying for a second,
    // fully redundant round trip on EVERY navigation before it could
    // even start its own data queries. Forward the already-validated
    // id/email as trusted request headers so pages can skip it. `.set()`
    // on a fresh Headers object replaces any value the client itself
    // sent under the same name — nothing downstream reads what the
    // client claims. This never widens authorization: every DB query is
    // still scoped by RLS via the real cookie-borne JWT regardless of
    // what these headers say.
    const headers = new Headers(request.headers);
    headers.set("x-maicol-user-id", user.id);
    headers.set("x-maicol-user-email", user.email ?? "");
    const withHeaders = NextResponse.next({ request: { headers } });
    for (const cookie of response.cookies.getAll()) {
      withHeaders.cookies.set(cookie);
    }
    response = withHeaders;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
