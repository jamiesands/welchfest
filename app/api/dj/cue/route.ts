import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  let body: { song_id?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    // empty body — caller wants us to pick the top-voted queued
  }
  const id = body && typeof body.song_id === "string" ? body.song_id : null;
  const now = new Date().toISOString();

  if (id) {
    const { error } = await sb
      .from("songs")
      .update({ status: "cued", cued_at: now })
      .eq("id", id)
      .eq("status", "queued");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: top, error: pickErr } = await sb
    .from("songs")
    .select("id")
    .eq("status", "queued")
    .order("votes_count", { ascending: false })
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pickErr) return NextResponse.json({ error: pickErr.message }, { status: 500 });
  if (!top) return NextResponse.json({ ok: true, cued: null });

  const { error } = await sb
    .from("songs")
    .update({ status: "cued", cued_at: now })
    .eq("id", top.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cued: top.id });
}
