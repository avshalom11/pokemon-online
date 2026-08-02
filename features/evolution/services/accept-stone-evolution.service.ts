import "server-only";

import { getStoneEvolutionByItem, isEvolutionStoneItemId, type EvolutionStoneId } from "@/data/pokemon/pokemon-evolutions";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { evolutionSucceededMessage } from "@/features/evolution/messages/evolution-messages";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";

export type AcceptStoneEvolutionResult =
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
      stoneItemId: EvolutionStoneId;
      remainingStoneQuantity: number;
    }
  | { status: "not-owned" }
  | { status: "invalid-stone" }
  | { status: "invalid-target" }
  | { status: "insufficient-stone" }
  | { status: "already-evolved" };

// Thrown only to unwind prisma.$transaction below when a racing/duplicate
// confirmation loses — never surfaced past this file. See its one throw
// site's own comment for why a throw (rather than an early return) is what
// this particular race needs.
class ConcurrentStoneEvolutionError extends Error {}

// Server-side resolution of an accepted STONE evolution — the Inventory
// counterpart to accept-evolution.service.ts's acceptEvolution, reusing the
// exact same HP-preservation math and notification, but triggered
// immediately from an explicit Inventory confirmation rather than a stored
// pendingEvolutionSpeciesId row. Deliberately never reads or writes
// pendingEvolutionSpeciesId/evolutionPermanentlyBlocked — those are the
// level-evolution path's own state, and per this feature's own spec, stone
// evolution must stay fully independent of them (a Pokémon that
// permanently rejected a level evolution must still be able to stone-evolve
// if its species supports one).
//
// Ownership, stone ownership/quantity, and the exact stone-species pairing
// are all re-validated here against the DB/registry — never trusted from
// the client, which can only ever say "playerPokemonId X, stone Y".
//
// Stone consumption and the species change are both guarded by their own
// atomic precondition (removeInventoryItem's `quantity >= 1`, and this
// function's own `speciesId` check-and-set), and either guard failing rolls
// back the whole transaction — so two racing/duplicate confirmations for
// the same Pokémon can never consume two stones: the loser's species
// check-and-set matches zero rows, which throws to undo the stone it had
// already (provisionally) consumed inside this same transaction.
export async function acceptStoneEvolution(
  playerId: string,
  playerPokemonId: string,
  stoneItemId: string
): Promise<AcceptStoneEvolutionResult> {
  if (!isEvolutionStoneItemId(stoneItemId)) {
    return { status: "invalid-stone" };
  }

  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });
  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  // Re-derived from the canonical Stone Evolution table, never trusted from
  // the client's stoneItemId alone — same "validate the target matches the
  // canonical Species Registry evolution data" rule accept-evolution.
  // service.ts already follows for the level path.
  const canonicalEvolution = getStoneEvolutionByItem(pokemon.speciesId, stoneItemId);
  if (!canonicalEvolution) {
    return { status: "invalid-target" };
  }

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  const evolvedSpecies = getSpeciesById(canonicalEvolution.evolvesToSpeciesId);
  if (!currentSpecies || !evolvedSpecies) {
    return { status: "invalid-target" };
  }

  // Same missing-HP-preserved rule as accept-evolution.service.ts: never a
  // full heal, a fainted Pokémon stays fainted, otherwise clamped to at
  // least 1 and never above the new max.
  const oldMaxHp = calculatePokemonHpStat(currentSpecies.baseStats.health, pokemon.level);
  const newMaxHp = calculatePokemonHpStat(evolvedSpecies.baseStats.health, pokemon.level);
  const missingHp = Math.max(0, oldMaxHp - pokemon.currentHp);
  const newCurrentHp = pokemon.currentHp <= 0 ? 0 : Math.max(1, Math.min(newMaxHp, newMaxHp - missingHp));

  try {
    const applied = await prisma.$transaction(async (tx) => {
      const consumed = await removeInventoryItem(tx, playerId, stoneItemId, 1);
      if (!consumed) {
        return { status: "insufficient-stone" as const };
      }

      // Atomic check-and-set: the precondition ("still the pre-evolution
      // species") is encoded directly in the WHERE clause, same idiom
      // evolution-progress.service.ts's tryCreatePendingEvolution and
      // accept-evolution.service.ts's own updateMany already use. A
      // racing/duplicate confirmation that lost the race matches zero rows
      // here — after it already consumed a stone above — so it must throw
      // rather than return, to roll back that stone consumption too.
      const updated = await tx.playerPokemon.updateMany({
        where: { id: playerPokemonId, playerId, speciesId: pokemon.speciesId },
        data: { speciesId: evolvedSpecies.id, currentHp: newCurrentHp },
      });

      if (updated.count === 0) {
        throw new ConcurrentStoneEvolutionError();
      }

      await createNotification(
        tx,
        playerId,
        "POKEMON_EVOLVED",
        evolutionSucceededMessage(currentSpecies.name, evolvedSpecies.name)
      );

      const remainingStoneQuantity = await getInventoryItemQuantity(tx, playerId, stoneItemId);

      return { status: "success" as const, remainingStoneQuantity };
    });

    if (applied.status === "insufficient-stone") {
      return { status: "insufficient-stone" };
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
      stoneItemId,
      remainingStoneQuantity: applied.remainingStoneQuantity,
    };
  } catch (error) {
    if (error instanceof ConcurrentStoneEvolutionError) {
      return { status: "already-evolved" };
    }
    throw error;
  }
}
