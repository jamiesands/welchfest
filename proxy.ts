import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/moderate/login" || pathname.startsWith("/api/moderate/login")) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get("welchfest_mod");
  if (cookie?.value === "1") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/moderate/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/moderate/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/moderate/:path*", "/api/moderate/:path*"],
};
