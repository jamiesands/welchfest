import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parsePenaltyInput, revalidateLeaderboard } from "../../_penalty";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = parsePenaltyInput(body, { requirePlayer: false });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (Object.keys(parsed.values).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("penalty_shootout")
    .update(parsed.values)
    .eq("id", id)
    .select("id, player_name, depot, score")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateLeaderboard();
  return NextResponse.json({ row: data });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("penalty_shootout")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateLeaderboard();
  return NextResponse.json({ ok: true });
}
