import "server-only";

import { prisma } from "@/lib/db/prisma";

// STAFF / MODERATION — PHASE 1/3/5. The authoritative ACTIVE-ban
// derivation — "current ban status" is never a stored flag anywhere (see
// prisma/schema.prisma's ModerationAction doc comment), it is always
// computed here, fresh, from the append-only history. Nothing in this
// phase calls these from auth/session resolution or Global Chat sending
// — that wiring is later work.
//
// `client` (PHASE 3) — defaults to the shared `prisma` singleton for every
// ordinary read-only caller, but accepts a `Prisma.TransactionClient` (the
// `tx` a service receives inside `prisma.$transaction`) too — this is what
// lets moderation-progression.service.ts's own duplicate-active-ban guard
// (issueChatBan/issueTemporarySiteBan/issuePermanentSiteBan's underlying
// recordX functions) reuse the EXACT SAME "what counts as active"
// definition from inside its own transaction, instead of a second,
// separately-maintained query that could drift out of sync with this one.
type ModerationActionQueryClient = Pick<typeof prisma, "moderationAction">;

interface ActiveBanRow {
  id: string;
  expiresAt: Date | null;
}

// Shared by every function below — the ONE query shape "an active ban of
// this type for this player" is ever built from. `requireFutureExpiry`
// true for the two temporary types (chat_ban/site_ban — active means not
// revoked AND expiresAt still in the future relative to `now`); false for
// permanent_site_ban (no expiresAt at all — active means simply not
// revoked, see isPermanentlySiteBanned's own doc comment below).
async function findActiveBanRow(
  playerId: string,
  actionType: "chat_ban" | "site_ban" | "permanent_site_ban",
  now: Date,
  client: ModerationActionQueryClient,
  requireFutureExpiry: boolean
): Promise<ActiveBanRow | null> {
  const where: Record<string, unknown> = { targetPlayerId: playerId, actionType, revokedAt: null };
  if (requireFutureExpiry) where.expiresAt = { gt: now };
  const activeBan = await client.moderationAction.findFirst({ where });
  return activeBan ? { id: activeBan.id, expiresAt: activeBan.expiresAt } : null;
}

// A temporary ban (chat or site) is ACTIVE when: the right actionType,
// not revoked, and its stored expiresAt is still in the future relative
// to `now`. `now` is an explicit parameter (defaulting to `new Date()`)
// rather than always reading the real clock internally, so tests can
// assert exact boundary behavior (an expiresAt exactly equal to `now` is
// NOT active — findActiveBanRow's own `gt`) without relying on real
// wall-clock timing.
//
// STAFF / MODERATION — PHASE 4 — getActiveChatBanExpiry returns the
// active ban's own expiresAt (or null if not banned) rather than a bare
// boolean, so a caller that needs to SHOW the restriction's end time
// (Global Chat's own send rejection — features/chat/services/global-chat.
// service.ts) doesn't need a second, separately-shaped query.
//
// STAFF / MODERATION — PHASE 5 — getActiveChatBanId/getActiveSiteBanId/
// getActivePermanentSiteBanId return the active ban's own id instead —
// needed so a rejected "already-banned" punishment attempt (chat-ban.
// service.ts, site-ban.service.ts) can offer the UI a concrete existing
// action id to revoke-and-retry, without a second lookup duplicating this
// same query. isChatBanned/isSiteBanned/isPermanentlySiteBanned are now
// all thin wrappers over the same one findActiveBanRow call their own
// sibling id/expiry function already makes — never a fourth
// independently-maintained "what counts as active" query per ban type.
export async function getActiveChatBanExpiry(
  playerId: string,
  now: Date = new Date(),
  client: ModerationActionQueryClient = prisma
): Promise<Date | null> {
  const row = await findActiveBanRow(playerId, "chat_ban", now, client, true);
  return row?.expiresAt ?? null;
}

export async function getActiveChatBanId(
  playerId: string,
  now: Date = new Date(),
  client: ModerationActionQueryClient = prisma
): Promise<string | null> {
  const row = await findActiveBanRow(playerId, "chat_ban", now, client, true);
  return row?.id ?? null;
}

export async function isChatBanned(
  playerId: string,
  now: Date = new Date(),
  client: ModerationActionQueryClient = prisma
): Promise<boolean> {
  return (await getActiveChatBanId(playerId, now, client)) !== null;
}

export async function getActiveSiteBanId(
  playerId: string,
  now: Date = new Date(),
  client: ModerationActionQueryClient = prisma
): Promise<string | null> {
  const row = await findActiveBanRow(playerId, "site_ban", now, client, true);
  return row?.id ?? null;
}

export async function isSiteBanned(
  playerId: string,
  now: Date = new Date(),
  client: ModerationActionQueryClient = prisma
): Promise<boolean> {
  return (await getActiveSiteBanId(playerId, now, client)) !== null;
}

// A permanent site ban has no expiresAt at all — ACTIVE means simply "an
// unrevoked permanent_site_ban row exists for this player" (see
// recordPermanentSiteBan in moderation-progression.service.ts, the one
// place such a row is ever created — never with a duration/expiry).
// Remains active until an explicit revocation (revokeModerationAction)
// sets revokedAt; never self-expires.
export async function getActivePermanentSiteBanId(
  playerId: string,
  client: ModerationActionQueryClient = prisma
): Promise<string | null> {
  const row = await findActiveBanRow(playerId, "permanent_site_ban", new Date(), client, false);
  return row?.id ?? null;
}

export async function isPermanentlySiteBanned(playerId: string, client: ModerationActionQueryClient = prisma): Promise<boolean> {
  return (await getActivePermanentSiteBanId(playerId, client)) !== null;
}
