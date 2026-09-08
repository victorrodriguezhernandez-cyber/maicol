"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/config";

/**
 * Browser Supabase client. Only ever uses the publishable/anon key — every
 * table it can reach is protected by RLS (see supabase/migrations).
 */
export function createClient() {
  return createBrowserClient(
    publicConfig.supabaseUrl,
    publicConfig.supabaseAnonKey,
  );
}
