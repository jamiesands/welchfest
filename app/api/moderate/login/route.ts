import { NextResponse } from "next/server";
import { MOD_COOKIE, moderatorKey, moderatorToken } from "@/lib/moderator";

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
  const safeNext =
    next.startsWith("/moderate") || next.startsWith("/dj") ? next : "/moderate";
  const res = NextResponse.redirect(new URL(safeNext, req.url), { status: 303 });
  // 72h so a Friday-evening login still covers the whole event day.
  res.cookies.set(MOD_COOKIE, await moderatorToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 72,
  });
  return res;
}
