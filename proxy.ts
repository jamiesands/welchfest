import { NextResponse, type NextRequest } from "next/server";

const GATED = ["/moderate", "/dj"];
const GATED_API = ["/api/moderate", "/api/dj"];

function isGated(path: string): boolean {
  return GATED.some((p) => path === p || path.startsWith(`${p}/`)) ||
    GATED_API.some((p) => path.startsWith(`${p}/`));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/moderate/login" || pathname.startsWith("/api/moderate/login")) {
    return NextResponse.next();
  }
  if (!isGated(pathname)) return NextResponse.next();

  const cookie = req.cookies.get("welchfest_mod");
  if (cookie?.value === "1") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/moderate/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/moderate/:path*", "/api/moderate/:path*", "/dj/:path*", "/api/dj/:path*"],
};
