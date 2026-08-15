import "server-only";

import type { EggAcquisitionSource } from "@/features/eggs/types/egg.types";
import { prisma } from "@/lib/db/prisma";
import type { PlayerOwnedEgg, Prisma } from "@/lib/generated/prisma/client";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Creates one new owned-egg row. Deliberately generic (rarity/regionId/
// source are plain parameters, never inferred from "the current battle" or
// "the current shop region" here) — this is the one shared persistence
// primitive every acquisition path writes through, never a second egg
// storage mechanism.
//
// Takes an explicit Prisma client (`tx` a transaction, or the top-level
// `prisma` singleton — structurally interchangeable, same "tx-first"
// convention incrementDailyBattleCount/markSpeciesSeen already establish
// elsewhere in this project) rather than always reaching for `prisma`
// itself: EGGS PHASE 2's battle-drop path calls this from inside
// syncWildHp's own reward transaction (battle-session.service.ts) so an
// awarded egg can never be silently lost between "the roll succeeded" and
// "the row is actually saved" — it commits or rolls back together with the
// XP/currency reward it rode in on.
export async function createOwnedEgg(
  client: Prisma.TransactionClient,
  playerId: string,
  rarity: PokemonRarity,
  regionId: string,
  source?: EggAcquisitionSource
): Promise<PlayerOwnedEgg> {
  return client.playerOwnedEgg.create({
    data: { playerId, rarity, regionId, source: source ?? null },
  });
}

// Every egg the player owns that is NOT currently incubating — the
// unassigned-inventory view a future Hatchery/Inventory UI will read.
// Excluding via `activeIncubation: null` (a relation filter, not a second
// status column on PlayerOwnedEgg) is what keeps "no longer available as an
// unassigned egg while incubating" correct by construction: the moment
// features/eggs/services/incubation.service.ts's startIncubatingEgg creates
// a PlayerEggIncubation row for an egg, this query stops returning it,
// with nothing on the egg row itself needing to change.
export async function listOwnedEggs(playerId: string): Promise<PlayerOwnedEgg[]> {
  return prisma.playerOwnedEgg.findMany({
    where: { playerId, activeIncubation: null },
    orderBy: { createdAt: "asc" },
  });
}

// EGGS PHASE 5 — a plain by-id read, needed so the Hatchery view can join
// an active incubation (PlayerEggIncubation, which stores no rarity/region
// of its own) back to its egg's own rarity/regionId for display. Never
// used to bypass listOwnedEggs' own "not currently incubating" filter —
// this simply resolves one already-known ownedEggId.
export async function getOwnedEggById(eggId: string): Promise<PlayerOwnedEgg | null> {
  return prisma.playerOwnedEgg.findUnique({ where: { id: eggId } });
}
