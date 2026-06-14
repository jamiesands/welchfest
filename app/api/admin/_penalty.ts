import { revalidatePath } from "next/cache";

// Shared validation + revalidation for the penalty-shootout admin routes.
// Not a route.ts, so Next treats this purely as a module.

export type PenaltyValues = {
  player_name?: string;
  depot?: string | null;
  score?: number;
};

type Parsed = { values: PenaltyValues } | { error: string };

export function parsePenaltyInput(
  body: unknown,
  { requirePlayer }: { requirePlayer: boolean }
): Parsed {
  const b = (body ?? {}) as Record<string, unknown>;
  const values: PenaltyValues = {};

  if (b.player_name !== undefined) {
    if (typeof b.player_name !== "string" || !b.player_name.trim()) {
      return { error: "player_name must be a non-empty string" };
    }
    values.player_name = b.player_name.trim();
  } else if (requirePlayer) {
    return { error: "player_name required" };
  }

  if (b.depot !== undefined) {
    if (b.depot === null) {
      values.depot = null;
    } else if (typeof b.depot === "string") {
      values.depot = b.depot.trim() || null;
    } else {
      return { error: "depot must be a string or null" };
    }
  }

  if (b.score !== undefined) {
    const n = typeof b.score === "number" ? b.score : Number(b.score);
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      return { error: "score must be a non-negative integer" };
    }
    values.score = n;
  }

  return { values };
}

// Adding or removing rows can flip whether the leaderboard exists at all, so
// the public layout (nav gate) is revalidated alongside the page itself.
export function revalidateLeaderboard(): void {
  revalidatePath("/leaderboard");
  revalidatePath("/", "layout");
}
