import { createClient } from "@supabase/supabase-js";

type Client = ReturnType<typeof makeClient>;

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local."
    );
  }
  return createClient(url, anonKey, { db: { schema: "welchfest" } });
}

let cached: Client | null = null;
function getClient(): Client {
  if (!cached) cached = makeClient();
  return cached;
}

// Lazy proxy: defers env-var validation until first real use, so importing this
// module during static prerender (when env vars may not be set) doesn't throw.
export const supabase = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export type Guest = {
  id: string;
  name: string;
  depot: "DXF" | "BED" | "STI" | "GUEST";
  consent_given: boolean;
  created_at: string;
};
