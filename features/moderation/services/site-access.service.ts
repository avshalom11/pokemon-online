import "server-only";

import { isPermanentlySiteBanned, isSiteBanned } from "@/features/moderation/services/active-ban.service";

// STAFF / MODERATION — PHASE 4 — SITE BAN ENFORCEMENT. The one small,
// pure(ish) DECISION function lib/auth/auth-session.ts's getCurrentSession
// calls to decide whether to redirect — deliberately extracted out of
// auth-session.ts itself (rather than inlining the isSiteBanned/
// isPermanentlySiteBanned calls + the redirect() call together there) for
// exactly one reason: this function has no dependency on next/headers or
// next/navigation, so it is directly unit-testable under this project's
// plain node:test runner, unlike getCurrentSession itself (which pulls in
// both — see lib/auth/stale-session-redirect-loop.test.ts's own doc
// comment for why that file tests via source inspection instead). Every
// OTHER piece of behavior this function depends on (what counts as an
// active temporary/permanent ban) is already covered by
// active-ban.service.test.ts; this function's own job is only "combine
// the two checks and pick a redirect target", which is what gets tested
// here.
//
// Returns the path to redirect to, or null if the player should proceed
// normally — getCurrentSession() itself owns the actual `redirect(path)`
// call (a three-line, obviously-correct wrapper, reviewed by inspection
// rather than a unit test that would need to fake next/navigation).
export async function resolveSiteBanRedirectPath(playerId: string): Promise<string | null> {
  const [siteBanned, permanentlyBanned] = await Promise.all([
    isSiteBanned(playerId),
    isPermanentlySiteBanned(playerId),
  ]);
  return siteBanned || permanentlyBanned ? "/banned" : null;
}
