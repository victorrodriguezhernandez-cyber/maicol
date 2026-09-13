"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serverConfig } from "@/lib/config";

const signInSchema = z.object({ password: z.string().min(1).max(200) });

/**
 * Single-user sign-in (CRITICAL_FLOWS.md rule 8): the one "Usuario" field
 * the user types IS the Supabase Auth password for one fixed account.
 *
 * This runs server-side on purpose. When the same call lived in the
 * `"use client"` login page, the account's email was inlined into the
 * public JS bundle, so anyone could read the account identifier and only
 * had to guess a single word. Here the email never leaves the server.
 *
 * Returns a bare boolean — never which half of the credential pair was
 * wrong — so the response can't be used to confirm the account exists.
 */
export async function signIn(password: string): Promise<{ ok: boolean }> {
  const parsed = signInSchema.parse({ password });
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: serverConfig.accountEmail,
    password: parsed.password,
  });

  return { ok: !error };
}
