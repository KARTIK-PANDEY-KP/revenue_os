/**
 * Supabase browser client + auth helpers.
 *
 * If the Supabase env vars aren't set the app runs in DEMO mode: no login is
 * required and the backend's demo context is used. When configured, real
 * Supabase Auth (email magic link / password) gates the app.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const authEnabled = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  if (!client) client = createBrowserClient(url!, anon!);
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const c = supabase();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.access_token ?? null;
}
