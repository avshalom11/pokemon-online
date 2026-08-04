import "server-only";

import { isPendingEvolutionTargetValid } from "@/data/pokemon/pokemon-evolutions";
import { calculatePokemonNonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { applyEvolutionToPlayerPokemon, calculateEvolutionHpOutcome } from "@/features/evolution/services/apply-evolution.service";
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
// PlayerPokemon row's speciesId is ever changed by a LEVEL, Tyrogue
// LEVEL-STAT, or (post-choice) BRANCH evolution (same instance evolves in
// place; no new row is ever created — unlike a capture, this is not a new
// owned Pokémon). Evolution-item evolution has its own always-independent
// flow (accept-evolution-item.service.ts, Inventory-initiated, never
// touches pendingEvolutionSpeciesId). Ownership, the pending decision's
// continued existence, and the target species are all re-validated here
// against the DB/registry, never trusted from the client — a client can
// only ever say "I accept", never which species.
//
// Species change, HP write, pending-state clear, and the notification are
// all one transaction (via applyEvolutionToPlayerPokemon) — a partial
// evolution (e.g. species changed but HP left stale, or the pending flag
// left dangling) can never be observed.
export async function acceptEvolution(playerId: string, playerPokemonId: string): Promise<AcceptEvolutionResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (!pokemon.pendingEvolutionSpeciesId) {
    return { status: "no-pending-evolution" };
  }

  // Captured into a local (rather than re-reading pokemon.pendingEvolutionSpeciesId
  // below) so its narrowed `string` type survives into the prisma.$transaction
  // closure further down — TypeScript can't carry a property-access narrowing
  // like the null check above into a nested closure, even though the object
  // itself is never reassigned.
  const pendingEvolutionSpeciesId = pokemon.pendingEvolutionSpeciesId;

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  if (!currentSpecies) {
    return { status: "invalid-target" };
  }

  // Re-derived from the canonical evolution tables (level, Tyrogue's
  // level-stat branch, or an already-chosen Branch Evolution target — see
  // isPendingEvolutionTargetValid's own doc comment for why checking all
  // three here is safe), never trusted from the stored
  // pendingEvolutionSpeciesId column alone — that column was only ever
  // written by this codebase's own trusted server code (evolution-progress.
  // service.ts), but this still re-checks it against the Species Registry's
  // own current evolution data as the single source of truth, per this
  // phase's own explicit "validate the target matches the canonical
  // Species Registry evolution data" requirement. Re-computing the actual
  // Attack/Defense stats here (rather than trusting a stored decision) is
  // what makes Tyrogue's branch resolve from the Pokémon's real calculated
  // stats at accept time, exactly like at creation time.
  const attackStat = calculatePokemonNonHpStat(currentSpecies.baseStats.attack, pokemon.level);
  const defenseStat = calculatePokemonNonHpStat(currentSpecies.baseStats.defense, pokemon.level);

  const isValidTarget = isPendingEvolutionTargetValid(
    { speciesId: pokemon.speciesId, level: pokemon.level, attackStat, defenseStat },
    pendingEvolutionSpeciesId
  );

  if (!isValidTarget) {
    return { status: "invalid-target" };
  }

  const evolvedSpecies = getSpeciesById(pendingEvolutionSpeciesId);
  if (!evolvedSpecies) {
    return { status: "invalid-target" };
  }

  const { newMaxHp, newCurrentHp } = calculateEvolutionHpOutcome(currentSpecies, evolvedSpecies, pokemon.level, pokemon.currentHp);

  const applied = await prisma.$transaction((tx) =>
    applyEvolutionToPlayerPokemon({
      tx,
      playerId,
      playerPokemonId,
      expectedCurrentSpeciesId: pokemon.speciesId,
      currentSpeciesName: currentSpecies.name,
      evolvedSpecies,
      newCurrentHp,
      pendingEvolution: { expectedPendingEvolutionSpeciesId: pendingEvolutionSpeciesId },
    })
  );

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
