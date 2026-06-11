export const MOD_COOKIE = "welchfest_mod";

export function moderatorKey(): string {
  const key = process.env.MODERATOR_KEY;
  if (!key) {
    throw new Error("MODERATOR_KEY env var is not set.");
  }
  return key;
}

// The auth cookie carries a digest derived from MODERATOR_KEY rather than a
// guessable constant, so it can't be forged by simply setting a cookie in
// devtools. Web Crypto is available in both the edge runtime (proxy.ts) and
// Node route handlers, so the same helper serves both sides of the check.
export async function moderatorToken(): Promise<string> {
  const data = new TextEncoder().encode(`welchfest-mod:${moderatorKey()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
