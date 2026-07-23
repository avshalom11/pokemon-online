import "server-only";

import { calculateBattleStats } from "@/engine/battle/stat-calculation";
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

    const maxHp = calculateBattleStats(species.baseStats, pokemon.level).health;
    // Already full — excluded so a selection of only full-HP Pokémon never
    // triggers a no-op database write.
    if (pokemon.currentHp >= maxHp) return [];

    return [{ id: pokemon.id, maxHp }];
  });

  if (updates.length === 0) {
    return { status: "nothing-to-heal" };
  }

  await prisma.$transaction(
    updates.map(({ id, maxHp }) => prisma.playerPokemon.update({ where: { id }, data: { currentHp: maxHp } }))
  );

  return { status: "healed", healedIds: updates.map((update) => update.id) };
}
