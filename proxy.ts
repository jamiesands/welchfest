import { NextResponse, type NextRequest } from "next/server";
import { MOD_COOKIE, moderatorToken } from "@/lib/moderator";

// Gated surfaces all share the moderator key login at /moderate/login.
// /api/admin/* perform service-role writes (truck placements, the lorry
// winner, penalty-shootout rows), so they must never be reachable without
// the cookie. /moderate stays as the after-the-fact photo hide tool.
const GATED = ["/moderate"];
const GATED_API = ["/api/moderate", "/api/admin"];

function isGated(path: string): boolean {
  return (
    GATED.some((p) => path === p || path.startsWith(`${p}/`)) ||
    GATED_API.some((p) => path === p || path.startsWith(`${p}/`))
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/moderate/login" || pathname.startsWith("/api/moderate/login")) {
    return NextResponse.next();
  }
  if (!isGated(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(MOD_COOKIE);
  if (cookie?.value) {
    // Fail closed if MODERATOR_KEY is missing — the gate must never open
    // because the server is misconfigured.
    const expected = await moderatorToken().catch(() => null);
    if (expected && cookie.value === expected) return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/moderate/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/moderate/:path*",
    "/api/moderate/:path*",
    "/api/admin/:path*",
  ],
};
