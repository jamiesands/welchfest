// Server-side read layer for the public memento pages. Everything here uses
// the anon Supabase client (SELECT-only under RLS) and is defensive: a missing
// env var at build time or a transient network error resolves to an empty
// result rather than throwing, so prerender/ISR always succeeds and the page
// fills in on the next revalidation.

import { supabase } from "./supabase";
import { BUCKET } from "./photos";
import {
  BAND_ORDER,
  TRUCK_COLS,
  type Band,
  type Truck,
} from "./trucks";

export type GalleryPhoto = {
  id: string;
  unit_number: number;
  url: string;
  caption: string | null;
  guest_name: string | null;
  depot: string | null;
};

export type LorryDesign = {
  id: string;
  name: string;
  employee_name: string | null;
  image_url: string;
  is_winner: boolean;
};

export type PenaltyEntry = {
  id: string;
  player_name: string;
  depot: string | null;
  score: number;
};

const PUBLIC_OBJECT_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/${BUCKET}/` : null;
})();

function photoUrl(image_url: string | null, storage_path: string | null): string | null {
  if (image_url) return image_url;
  if (storage_path && PUBLIC_OBJECT_BASE) return `${PUBLIC_OBJECT_BASE}${storage_path}`;
  return null;
}

/** Approved still photos, oldest first by their sequential unit number. */
export async function getApprovedPhotos(): Promise<GalleryPhoto[]> {
  try {
    const { data, error } = await supabase
      .from("photos")
      .select("id, unit_number, image_url, storage_path, caption, guest_name, depot")
      .eq("type", "photo")
      .eq("status", "approved")
      .order("unit_number", { ascending: true });
    if (error || !data) return [];
    return data
      .map((p) => ({
        id: p.id as string,
        unit_number: p.unit_number as number,
        url: photoUrl(p.image_url as string | null, p.storage_path as string | null),
        caption: (p.caption as string | null) ?? null,
        guest_name: (p.guest_name as string | null) ?? null,
        depot: (p.depot as string | null) ?? null,
      }))
      .filter((p): p is GalleryPhoto => p.url !== null);
  } catch {
    return [];
  }
}

/** All trucks, grouped by band. Within a band: placed (1,2,3) first, then the
 *  rest by vote count. */
export async function getTrucksByBand(): Promise<Record<Band, Truck[]>> {
  const empty: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
  try {
    const { data, error } = await supabase
      .from("trucks")
      .select(TRUCK_COLS)
      .order("placement", { ascending: true, nullsFirst: false })
      .order("vote_count", { ascending: false })
      .order("display_name", { ascending: true });
    if (error || !data) return empty;
    const grouped: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
    for (const t of data as unknown as Truck[]) {
      if (BAND_ORDER.includes(t.band)) grouped[t.band].push(t);
    }
    return grouped;
  } catch {
    return empty;
  }
}

/** Lorry designs, winner first. */
export async function getLorryDesigns(): Promise<LorryDesign[]> {
  try {
    const { data, error } = await supabase
      .from("lorry_designs")
      .select("id, name, employee_name, image_url, is_winner")
      .order("is_winner", { ascending: false })
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as unknown as LorryDesign[];
  } catch {
    return [];
  }
}

/** Penalty-shootout leaderboard, highest score first. */
export async function getLeaderboard(): Promise<PenaltyEntry[]> {
  try {
    const { data, error } = await supabase
      .from("penalty_shootout")
      .select("id, player_name, depot, score")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as unknown as PenaltyEntry[];
  } catch {
    return [];
  }
}

/** Whether any penalty-shootout rows exist — gates the leaderboard nav/page. */
export async function hasLeaderboard(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("penalty_shootout")
      .select("id", { count: "exact", head: true });
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
