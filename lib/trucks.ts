export type Band = "new" | "mid" | "veteran";

export const BAND_ORDER: Band[] = ["new", "mid", "veteran"];

export const BAND_LABEL: Record<Band, string> = {
  new: "NEW FLEET",
  mid: "MID FLEET",
  veteran: "VETERAN FLEET",
};

export type Truck = {
  id: string;
  driver_name: string;
  display_name: string;
  depot: string;
  year: number;
  band: Band;
  photo_url: string | null;
  vote_count: number;
  created_at: string;
};

export const TRUCK_COLS =
  "id, driver_name, display_name, depot, year, band, photo_url, vote_count, created_at";
