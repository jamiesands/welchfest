export type SongStatus =
  | "queued"
  | "cued"
  | "playing"
  | "played"
  | "blocked"
  | "skipped";

export type Song = {
  id: string;
  guest_id: string | null;
  guest_name: string | null;
  depot: string | null;
  title: string;
  artist: string;
  status: SongStatus;
  votes_count: number;
  requested_at: string;
  cued_at: string | null;
  started_playing_at: string | null;
  finished_playing_at: string | null;
};

export type SongWithGuest = Song & {
  guest: { name: string; depot: string } | null;
};

export const SONG_COLS =
  "id, guest_id, guest_name, depot, title, artist, status, votes_count, requested_at, cued_at, started_playing_at, finished_playing_at, guest:guests!songs_guest_id_fkey(name, depot)";

export function songGuestName(s: SongWithGuest): string {
  return s.guest_name ?? s.guest?.name ?? "Guest";
}

export function songDepot(s: SongWithGuest): string {
  return s.depot ?? s.guest?.depot ?? "—";
}

// Done states sink to the bottom of guest-facing lists.
export const DONE_STATUSES: SongStatus[] = ["played", "skipped", "blocked"];

export function isDone(s: Pick<Song, "status">): boolean {
  return DONE_STATUSES.includes(s.status);
}

export function sortQueue<T extends Song>(rows: T[]): T[] {
  const cued = rows
    .filter((r) => r.status === "cued")
    .sort((a, b) => (a.cued_at ?? "").localeCompare(b.cued_at ?? ""));
  const queued = rows
    .filter((r) => r.status === "queued")
    .sort((a, b) => {
      if (b.votes_count !== a.votes_count) return b.votes_count - a.votes_count;
      return a.requested_at.localeCompare(b.requested_at);
    });
  return [...cued, ...queued];
}
