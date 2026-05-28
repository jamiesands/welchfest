import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Mark a specific song as played (sinks to the bottom of the guest queue).
// Used by the per-row PLAYED button on /dj for songs Jamie has already
// played without going through the queue. Distinct from /skip which
// always targets the currently-playing song.

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const songId = typeof body?.song_id === "string" ? body.song_id : null;
  if (!songId) {
    return NextResponse.json({ error: "song_id required" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("songs")
    .update({ status: "played", finished_playing_at: now })
    .eq("id", songId)
    .neq("status", "played");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
