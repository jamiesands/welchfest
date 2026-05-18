import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const sb = supabaseAdmin();
  const [pendingRes, hiddenRes] = await Promise.all([
    sb
      .from("photos")
      .select("id, unit_number, guest_id, storage_path, type, caption, status, created_at, moderated_at, guest:guests(name, depot)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    sb
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "hidden")
      .gte("moderated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (pendingRes.error || hiddenRes.error) {
    return NextResponse.json(
      { error: pendingRes.error?.message ?? hiddenRes.error?.message },
      { status: 500 }
    );
  }
  return NextResponse.json({
    pending: pendingRes.data ?? [],
    hiddenToday: hiddenRes.count ?? 0,
  });
}
