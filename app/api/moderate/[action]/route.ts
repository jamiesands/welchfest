import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ACTIONS = {
  approve: "approved",
  hide: "hidden",
} as const;

type Action = keyof typeof ACTIONS;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string }> }
) {
  const { action } = await ctx.params;
  if (!(action in ACTIONS)) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const status = ACTIONS[action as Action];
  const { error } = await supabaseAdmin()
    .from("photos")
    .update({ status, moderated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
