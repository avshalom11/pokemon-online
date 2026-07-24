import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic redirect only — cookie presence, no DB hit. Next.js runs this
// on every matched request (including prefetches), so it must stay cheap;
// the real, secure authorization check happens server-side on each page via
// getCurrentSession() (lib/auth/auth-session.ts), which this is explicitly
// not a substitute for.
//
// Note: this project's installed Next.js version renamed the middleware.ts
// file convention to proxy.ts (confirmed from node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/proxy.md) — a middleware.ts
// file would simply never run.
const PROTECTED_PATHS = ["/home", "/my-pokemon", "/map", "/battle", "/pokemon-center", "/onboarding/starter"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath && !sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && sessionCookie) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/home",
    "/home/:path*",
    "/my-pokemon",
    "/my-pokemon/:path*",
    "/map",
    "/map/:path*",
    "/battle",
    "/battle/:path*",
    "/pokemon-center",
    "/pokemon-center/:path*",
    "/onboarding/starter",
  ],
};
