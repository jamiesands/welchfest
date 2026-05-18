import { createClient } from "@supabase/supabase-js";

// Server-only client. Holds the service role key. Never import from a
// 'use client' module.

type Admin = ReturnType<typeof build>;

function build() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "supabaseAdmin requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "welchfest" },
  });
}

let cached: Admin | null = null;

export function supabaseAdmin(): Admin {
  if (!cached) cached = build();
  return cached;
}
