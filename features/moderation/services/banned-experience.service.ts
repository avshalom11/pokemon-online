import "server-only";

import { prisma } from "@/lib/db/prisma";

// A real discriminated union (not a flat `{ type, expiresAt: string | null
// }` shape) — deliberately, so TypeScript itself proves the ONE real
// invariant here (a permanent ban has no expiry, a temporary one always
// does) at every call site, rather than a caller needing to remember to
// null-check expiresAt only for one branch.
export type BannedExperienceView = { type: "permanent" } | { type: "temporary"; expiresAt: string };

// STAFF / MODERATION — PHASE 4 — BANNED USER EXPERIENCE. The ONLY data
// app/banned/page.tsx is allowed to show a banned player about their own
// ban: which kind, and — for a temporary one — when it ends. Deliberately
// returns NOTHING ELSE — no reason, no actorPlayerId/staff identity, no
// ModerationAction id, no audit metadata of any kind (explicit product
// requirement) — by construction, since this is the one place that view
// shape is ever produced; a future richer moderation-history UI (staff-
// only, a different audience entirely) reads through
// moderation-progression.service.ts's own getModerationHistoryForPlayer
// instead, never this function.
//
// Returns null when the player is NOT actually (or no longer) banned —
// app/banned/page.tsx treats that as "nothing to show here", redirecting
// to /home rather than rendering an empty/confusing page. This is what
// keeps a lifted ban from leaving a stale "you're banned" page reachable
// by URL.
//
// Permanent takes priority when (in theory) both were somehow active at
// once — a permanent ban already blocks access outright, so there is
// nothing more specific a temporary ban's own expiry could usefully add
// on top of it.
export async function getBannedExperienceView(playerId: string): Promise<BannedExperienceView | null> {
  const permanentBan = await prisma.moderationAction.findFirst({
    where: { targetPlayerId: playerId, actionType: "permanent_site_ban", revokedAt: null },
  });
  if (permanentBan) return { type: "permanent" };

  const temporaryBan = await prisma.moderationAction.findFirst({
    where: { targetPlayerId: playerId, actionType: "site_ban", revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  if (temporaryBan?.expiresAt) return { type: "temporary", expiresAt: temporaryBan.expiresAt.toISOString() };

  return null;
}
