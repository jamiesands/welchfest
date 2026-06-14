import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parsePenaltyInput, revalidateLeaderboard } from "../_penalty";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = parsePenaltyInput(body, { requirePlayer: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("penalty_shootout")
    .insert({ score: 0, ...parsed.values })
    .select("id, player_name, depot, score")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateLeaderboard();
  return NextResponse.json({ row: data });
}
