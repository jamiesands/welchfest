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
  "id, guest_id, title, artist, status, votes_count, requested_at, cued_at, started_playing_at, finished_playing_at, guest:guests(name, depot)";

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
