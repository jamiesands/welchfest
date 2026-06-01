import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COLS =
  "id, unit_number, guest_id, storage_path, type, caption, status, created_at, moderated_at, guest:guests(name, depot)";

// Moderation now works on already-published photos: `live` is everything
// guests can see, `removed` is anything pulled. The client lets a moderator
// hide a live photo or restore a removed one.
export async function GET() {
  const sb = supabaseAdmin();
  const [liveRes, removedRes] = await Promise.all([
    sb
      .from("photos")
      .select(COLS)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("photos")
      .select(COLS)
      .eq("status", "hidden")
      .order("moderated_at", { ascending: false, nullsFirst: false })
      .limit(200),
  ]);

  if (liveRes.error || removedRes.error) {
    return NextResponse.json(
      { error: liveRes.error?.message ?? removedRes.error?.message },
      { status: 500 }
    );
  }
  return NextResponse.json({
    live: liveRes.data ?? [],
    removed: removedRes.data ?? [],
  });
}
