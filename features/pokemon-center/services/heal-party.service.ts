import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";

export type HealPartyResult =
  | { status: "healed"; healedIds: string[] }
  | { status: "nothing-to-heal" };

// The only place PlayerPokemon.currentHp is raised back to max outside of
// battle — mirrors syncPartyHpAction's "DB is the single source of truth"
// rule (features/battle/actions/sync-party-hp.action.ts). Every requested id
// is re-validated here against `playerId` (resolved server-side from the
// session, never trusted from the client) and against partySlot being set
// (currently in the active party) — a stale or foreign id is silently
// dropped rather than trusted, exactly like assignToPartySlot/removeFromParty
// (features/party/services/party-management.service.ts).
//
// Only species/level/level-derived max HP ever factor into the new HP value;
// level, experience, partySlot, moves, and ownership are never touched here.
export async function healParty(playerId: string, playerPokemonIds: string[]): Promise<HealPartyResult> {
  const candidates = await prisma.playerPokemon.findMany({
    where: {
      id: { in: playerPokemonIds },
      playerId,
      partySlot: { not: null },
    },
  });

  const updates = candidates.flatMap((pokemon) => {
    const species = getSpeciesById(pokemon.speciesId);
    if (!species) return [];

    const maxHp = calculatePokemonHpStat(species.baseStats.health, pokemon.level);
    // Phase 6F: a major status condition also counts as "something to
    // heal" now, even for an already full-HP Pokémon — otherwise a
    // poisoned-but-full-HP Pokémon could never be cured here at all.
    const alreadyFull = pokemon.currentHp >= maxHp;
    const hasStatus = pokemon.status !== null;
    if (alreadyFull && !hasStatus) return [];

    return [{ id: pokemon.id, maxHp, hasStatus }];
  });

  if (updates.length === 0) {
    return { status: "nothing-to-heal" };
  }

  await prisma.$transaction(
    updates.map(({ id, maxHp, hasStatus }) =>
      prisma.playerPokemon.update({
        where: { id },
        data: hasStatus
          ? { currentHp: maxHp, status: null, statusTurnsRemaining: null }
          : { currentHp: maxHp },
      })
    )
  );

  return { status: "healed", healedIds: updates.map((update) => update.id) };
}
