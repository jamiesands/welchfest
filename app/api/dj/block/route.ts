import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Mark a specific song as blocked. If body omits song_id, blocks whatever's
// currently playing (the BLOCK button on the now-departing pane).

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  let body: { song_id?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    // no body — block the currently playing one
  }
  const id = body && typeof body.song_id === "string" ? body.song_id : null;
  const now = new Date().toISOString();

  if (id) {
    const { error } = await sb
      .from("songs")
      .update({ status: "blocked", finished_playing_at: now })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await sb
    .from("songs")
    .update({ status: "blocked", finished_playing_at: now })
    .eq("status", "playing");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
