import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  driver_name?: unknown;
  display_name?: unknown;
  depot?: unknown;
  year?: unknown;
  photo_url?: unknown;
};

const DEPOTS = new Set(["DXF", "BED", "STI"]);

function str(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;

  const driver = str(body.driver_name);
  const display = str(body.display_name);
  const depot = str(body.depot);
  const year =
    typeof body.year === "number" ? body.year :
    typeof body.year === "string" ? Number(body.year) : NaN;
  const photoUrl = str(body.photo_url);

  if (!display) return NextResponse.json({ error: "display_name required" }, { status: 400 });
  if (!depot || !DEPOTS.has(depot)) return NextResponse.json({ error: "depot must be DXF, BED, or STI" }, { status: 400 });
  if (!Number.isInteger(year) || year < 1980 || year > 2026) {
    return NextResponse.json({ error: "year must be an integer 1980-2026" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("trucks")
    .insert({
      driver_name: driver ?? "",
      display_name: display,
      depot,
      year,
      photo_url: photoUrl || null,
    })
    .select("id, driver_name, display_name, depot, year, band, photo_url, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ truck: data });
}
