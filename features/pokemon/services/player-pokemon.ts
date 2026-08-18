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

// The "partySlot not null, ordered by slot, capped at MAX_ACTIVE_TEAM_SIZE"
// shape every active-party query uses — a single source of truth reused by
// both getPlayerParty (a standalone top-level query, `playerId` merged into
// its own `where`) and a caller that needs the party fetched alongside OTHER
// related data in ONE Prisma call (nested inside a `playerProfile.findUnique`'s
// own `select`, where `playerId` is already implied by the relation — see
// battle-session.service.ts's getActiveBattleSessionWithParty).
const PARTY_SLOT_FILTER = { partySlot: { not: null } } as const;
const PARTY_ORDER_AND_LIMIT = { orderBy: { partySlot: "asc" }, take: MAX_ACTIVE_TEAM_SIZE } as const;
export const PLAYER_PARTY_QUERY_ARGS = { where: PARTY_SLOT_FILTER, ...PARTY_ORDER_AND_LIMIT } as const;

// The player's real, persisted active party (PlayerPokemon.partySlot),
// ordered by slot 1-6. Slot 1 is the battle starter — see
// features/battle/services/battle-view.service.ts. `take` is a defensive
// cap only; the `[playerId, partySlot]` unique constraint already makes more
// than MAX_ACTIVE_TEAM_SIZE occupied slots impossible.
export async function getPlayerParty(playerId: string): Promise<OwnedPokemon[]> {
  const rows = await prisma.playerPokemon.findMany({
    where: { playerId, ...PARTY_SLOT_FILTER },
    ...PARTY_ORDER_AND_LIMIT,
  });

  return hydrateOwnedPokemonRows(rows);
}

// Row -> OwnedPokemon hydration for a caller that already fetched its own
// PlayerPokemon rows (e.g. as a nested relation on a different top-level
// query) rather than calling getPlayerParty itself — keeps hydrateOwnedPokemon's
// per-row logic private to this file either way.
export function hydrateOwnedPokemonRows(rows: PlayerPokemonModel[]): OwnedPokemon[] {
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
