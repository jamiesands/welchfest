export type Band = "new" | "mid" | "veteran";

export const BAND_ORDER: Band[] = ["new", "mid", "veteran"];

export const BAND_LABEL: Record<Band, string> = {
  new: "NEW FLEET",
  mid: "MID FLEET",
  veteran: "VETERAN FLEET",
};

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

export const PLACEMENT_LABEL: Record<NonNullable<Placement>, string> = {
  1: "WINNER",
  2: "RUNNER-UP",
  3: "THIRD",
};
