import "server-only";

import { prisma } from "@/lib/db/prisma";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { PlayerPokemonModel } from "@/lib/generated/prisma/models";

// Ownership queries over PlayerPokemon, hydrated against the species catalog
// (getSpeciesById) so callers never read raw PlayerPokemon rows directly.
// Sibling to species-catalog.ts, which handles the species side of the same
// split (PlayerPokemon = ownership state only, catalog = species facts).

// Shared row -> OwnedPokemon hydration, used by every query below so the
// mapping (and its derived fields) only exists in one place.
function hydrateOwnedPokemon(row: PlayerPokemonModel): OwnedPokemon | null {
  const species = getSpeciesById(row.speciesId);

  if (!species) {
    return null;
  }

  return {
    id: row.id,
    species,
    nickname: row.nickname,
    level: row.level,
    experience: row.experience,
    currentHp: row.currentHp,
    maxHp: calculatePokemonHpStat(species.baseStats.health, row.level),
    isStarter: row.isStarter,
    caughtAt: row.createdAt,
    // See the isShiny doc comment on OwnedPokemon (shared/types/player-pokemon.ts).
    isShiny: false,
    partySlot: row.partySlot,
    status: row.status,
    statusTurnsRemaining: row.statusTurnsRemaining,
  };
}

// The player's real, persisted active party (PlayerPokemon.partySlot),
// ordered by slot 1-6. Slot 1 is the battle starter — see
// features/battle/services/battle-view.service.ts. `take` is a defensive
// cap only; the `[playerId, partySlot]` unique constraint already makes more
// than MAX_ACTIVE_TEAM_SIZE occupied slots impossible.
export async function getPlayerParty(playerId: string): Promise<OwnedPokemon[]> {
  const rows = await prisma.playerPokemon.findMany({
    where: { playerId, partySlot: { not: null } },
    orderBy: { partySlot: "asc" },
    take: MAX_ACTIVE_TEAM_SIZE,
  });

  return rows.flatMap((row) => hydrateOwnedPokemon(row) ?? []);
}

// Every Pokémon a player owns, not capped at MAX_ACTIVE_TEAM_SIZE — powers
// the My Pokémon collection grid. Same default ordering as getPlayerParty
// for a stable, predictable listing (starter first, then oldest-caught).
export async function getAllOwnedPokemon(playerId: string): Promise<OwnedPokemon[]> {
  const rows = await prisma.playerPokemon.findMany({
    where: { playerId },
    orderBy: [{ isStarter: "desc" }, { createdAt: "asc" }],
  });

  return rows.flatMap((row) => hydrateOwnedPokemon(row) ?? []);
}

export interface OwnedPokemonStats {
  totalCaught: number;
  uniqueSpeciesCaught: number;
}

// Not capped at MAX_ACTIVE_TEAM_SIZE (unlike getPlayerParty) — this counts
// every Pokémon a player owns, which will exceed the party size once box/PC
// storage exists.
export async function getOwnedPokemonStats(playerId: string): Promise<OwnedPokemonStats> {
  const [totalCaught, distinctSpecies] = await Promise.all([
    prisma.playerPokemon.count({ where: { playerId } }),
    prisma.playerPokemon.findMany({
      where: { playerId },
      distinct: ["speciesId"],
      select: { speciesId: true },
    }),
  ]);

  return { totalCaught, uniqueSpeciesCaught: distinctSpecies.length };
}
