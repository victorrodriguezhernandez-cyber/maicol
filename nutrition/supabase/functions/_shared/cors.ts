// Supabase Edge Functions run on Deno; these are invoked only from our own
// app (via supabase-js functions.invoke with the user's session), never
// loaded cross-origin from a browser tab we don't control, so a permissive
// CORS header here is standard practice for Supabase Edge Functions and is
// not itself a security boundary — auth is enforced by verifying the JWT.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
