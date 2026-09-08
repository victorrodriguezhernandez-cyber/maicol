import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TEMPORARY, ONE-TIME-USE — deleted immediately after being called once.
// Sets the account's Supabase Auth password to the value the login
// screen now calls "Usuario", using the service-role key (which only
// exists server-side, in Vercel's env, never in this repo) so the user
// doesn't have to already be logged in to get this set up — the whole
// point, since logging in is exactly what was broken.
const BOOTSTRAP_TOKEN = "21199de2ab8ce476932afd0500872cd301b2f4f47a6cce30";
const TARGET_EMAIL = "victorhub2008@gmail.com";
const NEW_USERNAME = "victorrh2008";

export async function POST(req: Request) {
  const token = req.headers.get("x-bootstrap-token");
  if (token !== BOOTSTRAP_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const user = data.users.find((u) => u.email === TARGET_EMAIL);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: NEW_USERNAME,
  });
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ status: "ok", userId: user.id });
}
