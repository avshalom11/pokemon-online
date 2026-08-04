import "server-only";

import { getEvolutionItemEvolutionByItem, isEvolutionItemId, type EvolutionItemId } from "@/data/pokemon/pokemon-evolutions";
import { applyEvolutionToPlayerPokemon, calculateEvolutionHpOutcome } from "@/features/evolution/services/apply-evolution.service";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";

export type AcceptEvolutionItemResult =
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
      itemId: EvolutionItemId;
      remainingItemQuantity: number;
    }
  | { status: "not-owned" }
  | { status: "invalid-item" }
  | { status: "invalid-target" }
  | { status: "insufficient-item" }
  | { status: "already-evolved" };

// Thrown only to unwind prisma.$transaction below when a racing/duplicate
// confirmation loses — never surfaced past this file. See its one throw
// site's own comment for why a throw (rather than an early return) is what
// this particular race needs.
class ConcurrentEvolutionItemError extends Error {}

// Server-side resolution of an accepted EVOLUTION-ITEM evolution — the
// Inventory counterpart to accept-evolution.service.ts's acceptEvolution,
// reusing the exact same HP-preservation math and notification, but
// triggered immediately from an explicit Inventory confirmation rather
// than a stored pendingEvolutionSpeciesId row. Covers both the original
// Stone evolutions and the former Trade-with-held-item evolutions
// (Evolution Simplification phase merged them into one table — see
// data/pokemon/pokemon-evolutions.ts's EVOLUTION_ITEM_EVOLUTIONS) — no
// trade of any kind is ever involved here, only a direct item use.
// Deliberately never reads or writes pendingEvolutionSpeciesId/
// pendingEvolutionBranch/evolutionPermanentlyBlocked — those are the
// level-evolution path's own state, and per this feature's own spec,
// evolution-item evolution must stay fully independent of them (a Pokémon
// that permanently rejected a level evolution must still be able to
// item-evolve if its species supports one).
//
// Ownership, item ownership/quantity, and the exact item-species pairing
// are all re-validated here against the DB/registry — never trusted from
// the client, which can only ever say "playerPokemonId X, item Y".
//
// Item consumption and the species change are both guarded by their own
// atomic precondition (removeInventoryItem's `quantity >= 1`, and this
// function's own `speciesId` check-and-set), and either guard failing rolls
// back the whole transaction — so two racing/duplicate confirmations for
// the same Pokémon can never consume two items: the loser's species
// check-and-set matches zero rows, which throws to undo the item it had
// already (provisionally) consumed inside this same transaction.
export async function acceptEvolutionItem(
  playerId: string,
  playerPokemonId: string,
  itemId: string
): Promise<AcceptEvolutionItemResult> {
  if (!isEvolutionItemId(itemId)) {
    return { status: "invalid-item" };
  }

  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });
  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  // Re-derived from the canonical Evolution-Item table, never trusted from
  // the client's itemId alone — same "validate the target matches the
  // canonical Species Registry evolution data" rule accept-evolution.
  // service.ts already follows for the level path.
  const canonicalEvolution = getEvolutionItemEvolutionByItem(pokemon.speciesId, itemId);
  if (!canonicalEvolution) {
    return { status: "invalid-target" };
  }

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  const evolvedSpecies = getSpeciesById(canonicalEvolution.evolvesToSpeciesId);
  if (!currentSpecies || !evolvedSpecies) {
    return { status: "invalid-target" };
  }

  // Same missing-HP-preserved rule as accept-evolution.service.ts (shared
  // via calculateEvolutionHpOutcome): never a full heal, a fainted Pokémon
  // stays fainted, otherwise clamped to at least 1 and never above the new
  // max.
  const { newMaxHp, newCurrentHp } = calculateEvolutionHpOutcome(currentSpecies, evolvedSpecies, pokemon.level, pokemon.currentHp);

  try {
    const applied = await prisma.$transaction(async (tx) => {
      const consumed = await removeInventoryItem(tx, playerId, itemId, 1);
      if (!consumed) {
        return { status: "insufficient-item" as const };
      }

      // Atomic check-and-set via applyEvolutionToPlayerPokemon's own
      // "still the pre-evolution species" WHERE guard — same idiom
      // evolution-progress.service.ts's tryCreatePendingEvolution already
      // uses. A racing/duplicate confirmation that lost the race matches
      // zero rows here — after it already consumed an item above — so it
      // must throw rather than return, to roll back that item consumption
      // too. Deliberately omits `pendingEvolution` — evolution-item
      // evolution never reads or writes pendingEvolutionSpeciesId/
      // pendingEvolutionBranch/evolutionPermanentlyBlocked (see this
      // file's own top-of-file doc comment).
      const updated = await applyEvolutionToPlayerPokemon({
        tx,
        playerId,
        playerPokemonId,
        expectedCurrentSpeciesId: pokemon.speciesId,
        currentSpeciesName: currentSpecies.name,
        evolvedSpecies,
        newCurrentHp,
      });

      if (!updated) {
        throw new ConcurrentEvolutionItemError();
      }

      const remainingItemQuantity = await getInventoryItemQuantity(tx, playerId, itemId);

      return { status: "success" as const, remainingItemQuantity };
    });

    if (applied.status === "insufficient-item") {
      return { status: "insufficient-item" };
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
      itemId,
      remainingItemQuantity: applied.remainingItemQuantity,
    };
  } catch (error) {
    if (error instanceof ConcurrentEvolutionItemError) {
      return { status: "already-evolved" };
    }
    throw error;
  }
}
