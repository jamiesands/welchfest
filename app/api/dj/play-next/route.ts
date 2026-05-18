import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Promote one song to 'playing'. Picks the oldest 'cued' song; if none,
// the top-voted 'queued'. Any currently-playing song flips to 'played'.

export async function POST() {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: cued } = await sb
    .from("songs")
    .select("id")
    .eq("status", "cued")
    .order("cued_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextId: string | null = cued?.id ?? null;

  if (!nextId) {
    const { data: topQueued, error } = await sb
      .from("songs")
      .select("id")
      .eq("status", "queued")
      .order("votes_count", { ascending: false })
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    nextId = topQueued?.id ?? null;
  }

  if (!nextId) {
    return NextResponse.json({ ok: true, next: null });
  }

  const { error: closeErr } = await sb
    .from("songs")
    .update({ status: "played", finished_playing_at: now })
    .eq("status", "playing");
  if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 500 });

  const { error: startErr } = await sb
    .from("songs")
    .update({ status: "playing", started_playing_at: now })
    .eq("id", nextId);
  if (startErr) return NextResponse.json({ error: startErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, next: nextId });
}
