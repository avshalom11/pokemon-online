import "server-only";

import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
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

// REGION TRAVEL COST — the only place PlayerProfile.regionId is ever
// written. The price is resolved here, server-side, from
// region-travel-cost.config.ts's own REGION_TRAVEL_COST — a caller only
// ever supplies `regionId`; there is no parameter through which a client
// (or a bug in a future caller) could substitute its own price.
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
//
// Ends any in-progress field battle session in the same transaction, same
// forfeit semantics this function always had (no reward, no victory count,
// no item consumption — only the row is deleted, same as endBattleSession
// in battle-session.service.ts) — but ONLY when the region genuinely
// changed (`moved.count > 0`); a same-region/insufficient-funds outcome
// must never forfeit a session that was never actually left.
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

    await tx.fieldBattleSession.deleteMany({ where: { playerId } });
    return "success";
  });
}
