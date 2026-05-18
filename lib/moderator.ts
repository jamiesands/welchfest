export const MOD_COOKIE = "welchfest_mod";

export function moderatorKey(): string {
  const key = process.env.MODERATOR_KEY;
  if (!key) {
    throw new Error("MODERATOR_KEY env var is not set.");
  }
  return key;
}
