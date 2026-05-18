import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Mark current 'playing' as 'skipped' and auto-advance to the next cued /
// top-voted queued.

export async function POST() {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const { error: skipErr } = await sb
    .from("songs")
    .update({ status: "skipped", finished_playing_at: now })
    .eq("status", "playing");
  if (skipErr) return NextResponse.json({ error: skipErr.message }, { status: 500 });

  const { data: cued } = await sb
    .from("songs")
    .select("id")
    .eq("status", "cued")
    .order("cued_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextId: string | null = cued?.id ?? null;
  if (!nextId) {
    const { data: topQueued } = await sb
      .from("songs")
      .select("id")
      .eq("status", "queued")
      .order("votes_count", { ascending: false })
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    nextId = topQueued?.id ?? null;
  }

  if (nextId) {
    const { error } = await sb
      .from("songs")
      .update({ status: "playing", started_playing_at: now })
      .eq("id", nextId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, next: nextId });
}
