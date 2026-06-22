// Static read layer for the public memento pages. Every value here comes from
// a build-time snapshot committed under /data — there is no backend. Image
// fields already point at local /images/*.webp assets, so nothing here touches
// the network. The functions stay async so the pages that await them are
// unchanged.

import photosData from "@/data/photos.json";
import trucksData from "@/data/trucks.json";
import lorryDesignsData from "@/data/lorry_designs.json";
import penaltyData from "@/data/penalty_shootout.json";
import { BAND_ORDER, type Band, type Truck } from "./trucks";

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

// Shapes of the snapshot JSON files (a row per record as exported from the
// frozen welchfest schema). Typed explicitly so an empty array still narrows.
type PhotoRow = {
  id: string;
  unit_number: number;
  image_url: string;
  caption: string | null;
  guest_name: string | null;
  depot: string | null;
};
type DesignRow = LorryDesign & { created_at: string };
type PenaltyRow = PenaltyEntry & { created_at: string };

const photos = photosData as PhotoRow[];
const trucks = trucksData as unknown as Truck[];
const designs = lorryDesignsData as DesignRow[];
const penalty = penaltyData as PenaltyRow[];

/** Approved still photos, oldest first by their sequential unit number. */
export async function getApprovedPhotos(): Promise<GalleryPhoto[]> {
  return photos.map((p) => ({
    id: p.id,
    unit_number: p.unit_number,
    url: p.image_url,
    caption: p.caption ?? null,
    guest_name: p.guest_name ?? null,
    depot: p.depot ?? null,
  }));
}

/** All trucks, grouped by band. Within a band: placed (1,2,3) first, then the
 *  rest by vote count, then display name. */
export async function getTrucksByBand(): Promise<Record<Band, Truck[]>> {
  const grouped: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
  const sorted = [...trucks].sort((a, b) => {
    const pa = a.placement ?? Number.POSITIVE_INFINITY;
    const pb = b.placement ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    return a.display_name.localeCompare(b.display_name);
  });
  for (const t of sorted) {
    if (BAND_ORDER.includes(t.band)) grouped[t.band].push(t);
  }
  return grouped;
}

/** Lorry designs, winner first, then oldest first. */
export async function getLorryDesigns(): Promise<LorryDesign[]> {
  return [...designs]
    .sort((a, b) => {
      if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
      return a.created_at.localeCompare(b.created_at);
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      employee_name: d.employee_name ?? null,
      image_url: d.image_url,
      is_winner: d.is_winner,
    }));
}

/** Penalty-shootout leaderboard, highest score first, then oldest first. */
export async function getLeaderboard(): Promise<PenaltyEntry[]> {
  return [...penalty]
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      player_name: r.player_name,
      depot: r.depot ?? null,
      score: r.score,
    }));
}

/** Whether any penalty-shootout rows exist — gates the leaderboard nav/page. */
export async function hasLeaderboard(): Promise<boolean> {
  return penalty.length > 0;
}
