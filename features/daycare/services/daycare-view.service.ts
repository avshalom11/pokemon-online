import "server-only";

import {
  DAYCARE_MAX_LEVELS_PER_STAY,
  DAYCARE_MAX_POKEMON_LEVEL,
  DAYCARE_MAX_SLOTS,
  getDaycareCostForNextLevel,
  getDaycareHoursForNextLevel,
} from "@/features/daycare/config/daycare.config";
import { calculateDaycareProgress } from "@/features/daycare/daycare-calculations";
import type { DaycareActiveStayView, DaycareEligiblePokemonView, DaycareViewData } from "@/features/daycare/types";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
import type { PlayerDaycareStay } from "@/lib/generated/prisma/client";

// The /daycare page's single aggregator (app/(game)/daycare/page.tsx's
// only data call, mirrors features/hatchery/services/hatchery-view.
// service.ts's own role for that page) — reads entirely through the
// existing PlayerPokemon/PlayerProfile tables plus this feature's own
// PlayerDaycareStay rows; never a second Pokémon-ownership mechanism.
//
// PHASE 2 — 5 SLOTS. Returns EVERY active stay this player currently has
// (0 to DAYCARE_MAX_SLOTS), each hydrated completely independently of the
// others — one stay's progress/debt calculation never reads or depends on
// any other stay's own row. The deposit selector (eligiblePokemon) is
// populated whenever there's at least one free slot, not only when the
// player has zero active stays.
export async function getDaycareViewData(playerId: string): Promise<DaycareViewData> {
  const [stayRows, profile] = await Promise.all([
    prisma.playerDaycareStay.findMany({ where: { playerId }, orderBy: { depositedAt: "asc" } }),
    prisma.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { coins: true } }),
  ]);

  const activeStays: DaycareActiveStayView[] = [];
  for (const stay of stayRows) {
    const view = await hydrateActiveStay(stay);
    if (view) activeStays.push(view);
  }

  const eligiblePokemon =
    activeStays.length < DAYCARE_MAX_SLOTS
      ? await listEligiblePokemon(
          playerId,
          activeStays.map((stay) => stay.playerPokemonId)
        )
      : [];

  return { activeStays, eligiblePokemon, playerMoney: profile.coins };
}

async function hydrateActiveStay(stay: PlayerDaycareStay): Promise<DaycareActiveStayView | null> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: stay.playerPokemonId } });
  // Defensive only — the FK's onDelete: Cascade (prisma/schema.prisma)
  // means this row cannot outlive its Pokémon in practice; never expected
  // to actually happen.
  if (!pokemon) return null;

  const species = getSpeciesById(pokemon.speciesId);
  const progress = calculateDaycareProgress({ startingLevel: stay.startingLevel, depositedAt: stay.depositedAt, now: new Date() });

  return {
    playerPokemonId: pokemon.id,
    speciesId: pokemon.speciesId,
    displayName: pokemon.nickname ?? species?.name ?? pokemon.speciesId,
    spriteUrl: species ? getFrontSpritePath(species) : "",
    depositedAt: stay.depositedAt.toISOString(),
    startingLevel: stay.startingLevel,
    earnedLevels: progress.earnedLevels,
    effectiveLevel: progress.effectiveLevel,
    debt: progress.debt,
    progressionStopped: progress.progressionStopped,
    stoppedReason: progress.stoppedReason,
    progressPercent: Math.round((progress.earnedLevels / DAYCARE_MAX_LEVELS_PER_STAY) * 100),
    nextLevelDueAt: progress.nextLevelDueAt ? progress.nextLevelDueAt.toISOString() : null,
    hoursForNextLevel: progress.progressionStopped ? null : getDaycareHoursForNextLevel(progress.effectiveLevel),
    costForNextLevel: progress.progressionStopped ? null : getDaycareCostForNextLevel(progress.effectiveLevel),
  };
}

// DEPOSIT ELIGIBILITY (Section 7) — every owned Pokémon that is NOT
// currently in the active party, NOT already at the level cap, and NOT
// one of this player's own OTHER already-deposited Pokémon (`excludeIds`
// — Phase 2's own multi-slot addition: with only one slot, this exclusion
// used to be automatic — reaching this branch at all meant zero stays
// existed — but with up to 5 concurrent stays, a Pokémon already deposited
// in one of them must never also appear as "still eligible" here).
async function listEligiblePokemon(playerId: string, excludeIds: readonly string[]): Promise<DaycareEligiblePokemonView[]> {
  const excludeSet = new Set(excludeIds);
  const rows = await prisma.playerPokemon.findMany({
    where: { playerId, partySlot: null, level: { lt: DAYCARE_MAX_POKEMON_LEVEL } },
    orderBy: [{ isStarter: "desc" }, { createdAt: "asc" }],
  });

  return rows.flatMap((row) => {
    if (excludeSet.has(row.id)) return [];
    const species = getSpeciesById(row.speciesId);
    if (!species) return [];

    return [
      {
        id: row.id,
        speciesId: row.speciesId,
        displayName: row.nickname ?? species.name,
        spriteUrl: getFrontSpritePath(species),
        level: row.level,
        hoursForNextLevel: getDaycareHoursForNextLevel(row.level),
        costForNextLevel: getDaycareCostForNextLevel(row.level),
      },
    ];
  });
}
