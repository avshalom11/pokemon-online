import "server-only";

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

// The only place PlayerProfile.regionId is ever written. Also ends any
// in-progress field battle session for this player in the same transaction
// — changing region while mid-battle must never leave a session whose
// zoneId belongs to the region the player just left, and per this feature's
// own spec this is a clean forfeit: no reward, no victory count, no item
// consumption (nothing here grants any of those; it only deletes the row,
// same as endBattleSession in battle-session.service.ts). Wrapped in one
// transaction so a change of region can never partially apply (profile
// updated but the stale session left behind, or vice versa).
export async function setActiveRegion(playerId: string, regionId: RegionId): Promise<void> {
  await prisma.$transaction([
    prisma.playerProfile.update({ where: { id: playerId }, data: { regionId } }),
    prisma.fieldBattleSession.deleteMany({ where: { playerId } }),
  ]);
}
