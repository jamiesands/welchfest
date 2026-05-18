import { NextResponse } from "next/server";
import { MOD_COOKIE, moderatorKey } from "@/lib/moderator";

export async function POST(req: Request) {
  const form = await req.formData();
  const submitted = String(form.get("key") ?? "");
  const next = String(form.get("next") ?? "/moderate");
  if (!submitted || submitted !== moderatorKey()) {
    const url = new URL("/moderate/login", req.url);
    url.searchParams.set("error", "1");
    if (next && next !== "/moderate") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }
  const safeNext = next.startsWith("/moderate") ? next : "/moderate";
  const res = NextResponse.redirect(new URL(safeNext, req.url), { status: 303 });
  res.cookies.set(MOD_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
