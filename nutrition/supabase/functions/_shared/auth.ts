import { createClient } from "npm:@supabase/supabase-js@^2.45.0";

/**
 * Verifies the caller's JWT (forwarded automatically by supabase-js
 * `functions.invoke`) and returns a Supabase client scoped to that user —
 * every query through it is still subject to RLS, so a function can never
 * accidentally read another user's data.
 */
export function getUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Response("Missing Authorization header", { status: 401 }) as never;

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export async function requireUser(req: Request) {
  const supabase = getUserClient(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }) as never;
  }
  return { supabase, user };
}
