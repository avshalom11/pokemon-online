import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";

// AUTH — STALE SESSION COOKIE RECOVERY. proxy.ts (project root) does an
// OPTIMISTIC redirect from "/" to "/home" (and from any PROTECTED_PATHS
// route to "/") based on cookie PRESENCE alone, deliberately with no DB
// hit (see its own doc comment). The real, DB-backed check happens in
// app/(game)/layout.tsx and app/onboarding/starter/page.tsx via
// getCurrentSession(). When a browser carries a session_token cookie whose
// underlying Session/User row no longer exists — most commonly because
// the account was deleted (on this device or another) after the cookie
// was issued — those two definitive checks correctly see "no session", but
// a plain `redirect("/")` from there sends the browser right back to a URL
// proxy.ts will bounce right back to "/home" (cookie still present,
// untouched) — an infinite ERR_TOO_MANY_REDIRECTS loop between "/" and the
// protected route, since nothing in that cycle ever clears the cookie.
//
// A Server Component (layout.tsx / a page component) cannot itself clear a
// cookie — Next.js only allows cookie writes from a Server Function or a
// Route Handler. This Route Handler is that one place: it reuses Better
// Auth's own real sign-out endpoint (the same one
// confirm-account-deletion.action.ts already calls) to get the correct
// Set-Cookie clearing instructions, copies them onto a redirect to "/",
// and stops the loop in exactly one extra hop — no manual "clear your
// cookies" step required for the affected browser.
export async function GET(request: NextRequest) {
  const signOutResponse = await auth.api.signOut({ headers: request.headers, asResponse: true });

  const redirectResponse = NextResponse.redirect(new URL("/", request.url));
  for (const cookie of signOutResponse.headers.getSetCookie()) {
    redirectResponse.headers.append("set-cookie", cookie);
  }
  return redirectResponse;
}
