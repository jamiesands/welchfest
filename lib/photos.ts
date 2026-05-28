import { supabase } from "./supabase";

export type PhotoType = "photo" | "360";
export type PhotoStatus = "pending" | "approved" | "hidden";

export type Photo = {
  id: string;
  unit_number: number;
  guest_id: string;
  storage_path: string;
  image_url: string | null;
  guest_name: string | null;
  depot: string | null;
  type: PhotoType;
  caption: string | null;
  status: PhotoStatus;
  created_at: string;
  moderated_at: string | null;
};

export type PhotoWithGuest = Photo & {
  guest: { name: string; depot: string } | null;
};

export function photoImageUrl(p: Pick<Photo, "image_url" | "storage_path">): string {
  return p.image_url ?? publicUrl(p.storage_path);
}

export function photoGuestName(p: PhotoWithGuest): string {
  return p.guest_name ?? p.guest?.name ?? "Guest";
}

export function photoDepot(p: PhotoWithGuest): string {
  return p.depot ?? p.guest?.depot ?? "—";
}

export const BUCKET = "welchfest-photos";

export function photoPath(guestId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${guestId}/${ts}-${rand}.jpg`;
}

export function publicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function formatClock(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function unit3(n: number): string {
  return String(n).padStart(3, "0");
}
