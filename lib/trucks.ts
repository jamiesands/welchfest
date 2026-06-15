export type Band = "new" | "mid" | "veteran";

export const BAND_ORDER: Band[] = ["new", "mid", "veteran"];

export const BAND_LABEL: Record<Band, string> = {
  new: "NEW FLEET",
  mid: "MID FLEET",
  veteran: "VETERAN FLEET",
};

// Year cut-offs that drive the GENERATED `band` column on welchfest.trucks
// (new >= 2024, mid >= 2021, else veteran). Kept here so admin previews match
// what the database actually computes.
export function bandForYear(year: number | null): Band | null {
  if (year === null || Number.isNaN(year)) return null;
  if (year >= 2024) return "new";
  if (year >= 2021) return "mid";
  return "veteran";
}

// 1 = winner, 2 / 3 = podium, null = unplaced. Judged by a human, not computed.
export type Placement = 1 | 2 | 3 | null;

export type Truck = {
  id: string;
  driver_name: string;
  display_name: string;
  depot: string;
  year: number;
  band: Band;
  photo_url: string | null;
  vote_count: number;
  placement: Placement;
  created_at: string;
};

export const TRUCK_COLS =
  "id, driver_name, display_name, depot, year, band, photo_url, vote_count, placement, created_at";

export const PLACEMENT_LABEL: Record<NonNullable<Placement>, string> = {
  1: "WINNER",
  2: "RUNNER-UP",
  3: "THIRD",
};
