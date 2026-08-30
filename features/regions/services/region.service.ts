import "server-only";

import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";
import { PLAYER_PARTY_QUERY_ARGS } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { toRegionId, type RegionId } from "@/shared/types/region";

// Single read path for "which region is this player currently in" — used by
// the World page (to highlight the active card) and anything else that
// needs the caller's own current region. Always normalized through
// toRegionId, same defensive fallback every other reader of
// PlayerProfile.regionId already uses.
export async function getActiveRegionId(userId: string): Promise<RegionId> {
  const profile = await getPlayerProfile(userId);
  return toRegionId(profile.regionId);
}

// Same "which region is this player currently in" read as getActiveRegionId
// above, but keyed by the PlayerProfile row's own id (playerId) rather than
// the auth session's userId — for server-side call sites that only ever
// receive playerId (e.g. features/battle/services/battle-action.service.ts's
// executeBattleAction, whose own signature is deliberately left unchanged
// by Phase 4 rather than threading a new regionId parameter through its ~70
// existing call sites). getPlayerProfile can't be reused here since it's
// keyed by userId, not id.
export async function getActiveRegionIdByPlayerId(playerId: string): Promise<RegionId> {
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: playerId } });
  return toRegionId(profile.regionId);
}

export type TravelToRegionResult = "success" | "same-region" | "insufficient-funds";

// Shared tail for BOTH travel paths below — forfeits any in-progress field
// battle session, but ONLY when the region genuinely changed
// (`moved.count > 0`); a same-region/insufficient-funds/not-eligible
// outcome must never forfeit a session that was never actually left. Same
// forfeit semantics this project always had (no reward, no victory count,
// no item consumption — only the row is deleted, same as endBattleSession
// in battle-session.service.ts). Kept as the one place this "only forfeit
// on a real move" rule lives, rather than duplicated in both
// travelToRegion and travelToRegionFree.
async function forfeitFieldBattleIfMoved(tx: Prisma.TransactionClient, playerId: string, moved: { count: number }): Promise<void> {
  if (moved.count > 0) {
    await tx.fieldBattleSession.deleteMany({ where: { playerId } });
  }
}

// REGION TRAVEL COST — the only place PlayerProfile.regionId is ever
// written (together with travelToRegionFree below). The price is resolved
// here, server-side, from region-travel-cost.config.ts's own
// REGION_TRAVEL_COST — a caller only ever supplies `regionId`; there is no
// parameter through which a client (or a bug in a future caller) could
// substitute its own price.
//
// The balance check, the currency deduction, and the region change are all
// one atomic guarded `updateMany`: `regionId: { not: regionId }` (only
// matches if this is actually a different region — see the "not:
// regionId" guard below) AND `coins: { gte: cost }` (only matches if the
// player can actually afford it) in the WHERE clause, with BOTH `regionId`
// and `coins` written in the SAME `data`. This is stronger than the usual
// spendCurrency-then-separate-write pattern (e.g. shop-purchase.service.
// ts): it makes "money deducted but region unchanged" or "region changed
// without successful payment" structurally impossible — there is no
// intermediate state between them, because there is no second write.
//
// It also makes a duplicate/double-click request self-cancelling rather
// than a double charge: the moment the FIRST request's update commits, the
// player's regionId already equals the destination, so a second racing
// request for that same destination fails the `regionId: { not: regionId
// }` guard (matches zero rows) and is reported as "same-region" — never a
// second deduction for landing somewhere the player is already standing.
export async function travelToRegion(playerId: string, regionId: RegionId): Promise<TravelToRegionResult> {
  const cost = getRegionTravelCost(regionId);

  return prisma.$transaction(async (tx) => {
    const moved = await tx.playerProfile.updateMany({
      where: { id: playerId, regionId: { not: regionId }, coins: { gte: cost } },
      data: { regionId, coins: { decrement: cost } },
    });

    if (moved.count === 0) {
      const current = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { regionId: true } });
      return current.regionId === regionId ? "same-region" : "insufficient-funds";
    }

    await forfeitFieldBattleIfMoved(tx, playerId, moved);
    return "success";
  });
}

// FREE FLY/SURF TRAVEL — the two move ids that qualify, checked against the
// active party's OWN known moves only (never storage). Either one is
// sufficient; a Pokémon knowing both is not treated any differently than
// one knowing either.
const FREE_TRAVEL_QUALIFYING_MOVE_IDS: string[] = ["fly", "surf"];

// The one reusable eligibility check for free travel — used both by the
// World page (to decide whether to even offer the free-travel button) and
// by travelToRegionFree below (the actual authoritative re-check at submit
// time; the page's own read is display-only and is never trusted as proof
// of eligibility by itself).
//
// Reuses PLAYER_PARTY_QUERY_ARGS.where (features/pokemon/services/
// player-pokemon.ts) — the SAME canonical "partySlot not null" filter every
// other active-party query in this codebase already shares — rather than
// redeclaring the party predicate here. Only ids are selected (never the
// full hydrated OwnedPokemon getPlayerParty returns) since species/stat
// data is irrelevant to this check.
//
// Deliberately does NOT filter on currentHp/status: a fainted or
// status-afflicted party Pokémon still "knows" the move it knows — nothing
// in this project's data model ties known-move-ness to HP, so a fainted
// party member with Fly/Surf still qualifies, per this feature's own
// explicit product rule.
export async function hasFreeTravelEligibility(playerId: string): Promise<boolean> {
  const party = await prisma.playerPokemon.findMany({
    where: { playerId, ...PLAYER_PARTY_QUERY_ARGS.where },
    select: { id: true },
  });

  if (party.length === 0) return false;

  const qualifyingMoves = await prisma.playerKnownMove.findMany({
    where: {
      playerPokemonId: { in: party.map((pokemon) => pokemon.id) },
      moveId: { in: FREE_TRAVEL_QUALIFYING_MOVE_IDS },
    },
    take: 1,
  });

  return qualifyingMoves.length > 0;
}

export type TravelToRegionFreeResult = "success" | "same-region" | "not-eligible";

// FREE FLY/SURF TRAVEL — the free counterpart to travelToRegion above.
// Deducts NO coins (the update's `data` never touches `coins` at all, not
// even a decrement of 0) and the WHERE guard has no `coins` condition
// either — unlike the paid path, a zero-row update here can only ever mean
// "already at that region", never "can't afford it", so there is no
// disambiguating re-read the way travelToRegion needs one.
//
// Eligibility is re-checked here, authoritatively, regardless of anything
// the caller (a Server Action, ultimately a client request) claims — same
// "server never trusts a client-supplied fact" principle travelToRegion
// already establishes for price. A caller that already displayed the
// free-travel option based on a stale read (party changed between page
// load and submit) gets "not-eligible" here, never a silent free trip.
export async function travelToRegionFree(playerId: string, regionId: RegionId): Promise<TravelToRegionFreeResult> {
  const eligible = await hasFreeTravelEligibility(playerId);
  if (!eligible) return "not-eligible";

  return prisma.$transaction(async (tx) => {
    const moved = await tx.playerProfile.updateMany({
      where: { id: playerId, regionId: { not: regionId } },
      data: { regionId },
    });

    if (moved.count === 0) return "same-region";

    await forfeitFieldBattleIfMoved(tx, playerId, moved);
    return "success";
  });
}
