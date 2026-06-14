import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Toggle the single winning lorry design. Setting a winner clears any existing
// one first so there is only ever one.
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { is_winner?: unknown };
  if (typeof body.is_winner !== "boolean") {
    return NextResponse.json(
      { error: "is_winner must be a boolean" },
      { status: 400 }
    );
  }
  const isWinner = body.is_winner;
  const sb = supabaseAdmin();

  if (isWinner) {
    const { error: clearErr } = await sb
      .from("lorry_designs")
      .update({ is_winner: false })
      .eq("is_winner", true)
      .neq("id", id);
    if (clearErr) {
      return NextResponse.json({ error: clearErr.message }, { status: 500 });
    }
  }

  const { error } = await sb
    .from("lorry_designs")
    .update({ is_winner: isWinner })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/designs");
  return NextResponse.json({ ok: true, is_winner: isWinner });
}
