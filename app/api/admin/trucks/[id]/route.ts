import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin().from("trucks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/awards");
  return NextResponse.json({ ok: true });
}

// Judge a placement: 1 / 2 / 3, or null to clear. Placements are unique within
// a band, so setting one clears any other truck in the same band that already
// holds it.
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { placement?: unknown };
  const placement = body.placement;
  if (
    placement !== null &&
    !(typeof placement === "number" && [1, 2, 3].includes(placement))
  ) {
    return NextResponse.json(
      { error: "placement must be 1, 2, 3, or null" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  if (placement !== null) {
    const { data: truck, error: readErr } = await sb
      .from("trucks")
      .select("band")
      .eq("id", id)
      .single();
    if (readErr || !truck) {
      return NextResponse.json(
        { error: readErr?.message ?? "truck not found" },
        { status: 404 }
      );
    }
    // Clear the same placement from any other truck in this band.
    const { error: clearErr } = await sb
      .from("trucks")
      .update({ placement: null })
      .eq("band", truck.band)
      .eq("placement", placement)
      .neq("id", id);
    if (clearErr) {
      return NextResponse.json({ error: clearErr.message }, { status: 500 });
    }
  }

  const { error } = await sb
    .from("trucks")
    .update({ placement })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/awards");
  return NextResponse.json({ ok: true, placement });
}
