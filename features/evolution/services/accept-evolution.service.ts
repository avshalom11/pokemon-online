import "server-only";

import { getLevelEvolution } from "@/data/pokemon/pokemon-evolutions";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { evolutionSucceededMessage } from "@/features/evolution/messages/evolution-messages";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";

export type AcceptEvolutionResult =
  | {
      status: "success";
      playerPokemonId: string;
      oldSpeciesName: string;
      newSpeciesId: string;
      newSpeciesName: string;
      level: number;
      experience: number;
      newMaxHp: number;
      newCurrentHp: number;
    }
  | { status: "not-owned" }
  | { status: "no-pending-evolution" }
  | { status: "invalid-target" };

// Server-side resolution of an accepted evolution — the only place a
// PlayerPokemon row's speciesId is ever changed by evolution (same
// instance evolves in place; no new row is ever created — unlike a
// capture, this is not a new owned Pokémon). Ownership, the pending
// decision's continued existence, and the target species are all
// re-validated here against the DB/registry, never trusted from the
// client — a client can only ever say "I accept", never which species.
//
// HP: missing HP (oldMaxHp - currentHp) is preserved exactly, then
// re-applied against the evolved species' own max HP — never a full heal,
// per this phase's own explicit rule. A fainted Pokémon (currentHp === 0)
// stays at exactly 0; otherwise the result is clamped to at least 1 (an
// evolution can never itself reduce a conscious Pokémon to 0) and never
// above the new max.
//
// Species change, HP write, pending-state clear, and the notification are
// all one transaction — a partial evolution (e.g. species changed but HP
// left stale, or the pending flag left dangling) can never be observed.
export async function acceptEvolution(playerId: string, playerPokemonId: string): Promise<AcceptEvolutionResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (!pokemon.pendingEvolutionSpeciesId) {
    return { status: "no-pending-evolution" };
  }

  // Re-derived from the canonical Level Evolution table, never trusted
  // from the stored pendingEvolutionSpeciesId column alone — that column
  // was only ever written by this codebase's own trusted server code
  // (evolution-progress.service.ts), but this still re-checks it against
  // the Species Registry's own current evolution data as the single source
  // of truth, per this phase's own explicit "validate the target matches
  // the canonical Species Registry evolution data" requirement.
  const canonicalEvolution = getLevelEvolution(pokemon.speciesId);
  if (!canonicalEvolution || canonicalEvolution.evolvesToSpeciesId !== pokemon.pendingEvolutionSpeciesId) {
    return { status: "invalid-target" };
  }

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  const evolvedSpecies = getSpeciesById(pokemon.pendingEvolutionSpeciesId);
  if (!currentSpecies || !evolvedSpecies) {
    return { status: "invalid-target" };
  }

  const oldMaxHp = calculatePokemonHpStat(currentSpecies.baseStats.health, pokemon.level);
  const newMaxHp = calculatePokemonHpStat(evolvedSpecies.baseStats.health, pokemon.level);
  const missingHp = Math.max(0, oldMaxHp - pokemon.currentHp);

  const newCurrentHp =
    pokemon.currentHp <= 0 ? 0 : Math.max(1, Math.min(newMaxHp, newMaxHp - missingHp));

  const applied = await prisma.$transaction(async (tx) => {
    const updated = await tx.playerPokemon.updateMany({
      where: { id: playerPokemonId, pendingEvolutionSpeciesId: pokemon.pendingEvolutionSpeciesId },
      data: {
        speciesId: evolvedSpecies.id,
        currentHp: newCurrentHp,
        pendingEvolutionSpeciesId: null,
      },
    });

    // Guards the same race the pending-creation side guards (see
    // evolution-progress.service.ts) — a concurrent/duplicate accept for
    // the same Pokémon can only ever apply once; the loser's updateMany
    // matches zero rows and this whole transaction becomes a no-op
    // (nothing to roll back, since nothing was written, and nothing below
    // is trusted to have happened either).
    if (updated.count === 0) return false;

    await createNotification(
      tx,
      playerId,
      "POKEMON_EVOLVED",
      evolutionSucceededMessage(currentSpecies.name, evolvedSpecies.name)
    );

    return true;
  });

  if (!applied) {
    return { status: "no-pending-evolution" };
  }

  return {
    status: "success",
    playerPokemonId,
    oldSpeciesName: currentSpecies.name,
    newSpeciesId: evolvedSpecies.id,
    newSpeciesName: evolvedSpecies.name,
    level: pokemon.level,
    experience: pokemon.experience,
    newMaxHp,
    newCurrentHp,
  };
}
