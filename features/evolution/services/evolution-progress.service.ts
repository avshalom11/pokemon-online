import "server-only";

import { getLevelEvolution } from "@/data/pokemon/pokemon-evolutions";
import type { Prisma } from "@/lib/generated/prisma/client";

// The one place a level-up XP grant is ever checked for a newly-eligible
// evolution — called from features/pokemon-progression/pokemon-progression-service.ts's
// applyPokemonXpGrant, always AFTER that same function's own move-learning
// call (applyLevelUpMoveLearning), inside the same transaction. That
// ordering is deliberate and documented at both call sites: pending move
// learning is always resolved/considered before pending evolution for one
// XP grant, even though the two are surfaced to the player through
// completely different UI moments (move learning is resolved later, on
// demand, from the My Pokémon page; evolution is offered immediately, in
// the battle screen that produced it).
//
// Never chains past one stage: this only ever checks the Pokémon's
// CURRENT (pre-transaction) speciesId against the Level Evolution table
// (data/pokemon/pokemon-evolutions.ts), which is itself only ever one step
// deep per species. A Charmander that jumps straight to level 40 in one
// grant is offered Charmeleon (its own next stage) only — Charizard's
// threshold is irrelevant until Charmeleon has actually been accepted in a
// *later*, separate call, which will then see the (by-then-updated)
// speciesId "charmeleon" and look up *its* own next stage. This is what
// makes "do not skip stages" true without any special-casing here.
//
// Returns null (does nothing) whenever any of these hold — species has no
// level evolution, current level doesn't meet it yet, a pending decision
// already exists for this Pokémon, or evolution was permanently rejected
// for it — so a caller can always call this unconditionally on every XP
// grant, exactly like applyLevelUpMoveLearning already is, with no
// separate "should I even check" branch needed.
export async function tryCreatePendingEvolution(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  currentSpeciesId: string,
  newLevel: number,
  pendingEvolutionSpeciesId: string | null,
  evolutionPermanentlyBlocked: boolean
): Promise<string | null> {
  if (pendingEvolutionSpeciesId !== null || evolutionPermanentlyBlocked) {
    return null;
  }

  const evolution = getLevelEvolution(currentSpeciesId);
  if (!evolution || newLevel < evolution.requiredLevel) {
    return null;
  }

  // Atomic check-and-set: the precondition (still no pending decision, not
  // blocked) is encoded directly in the WHERE clause, same idiom
  // currency-reward.service.ts's spendCurrency and every other
  // race-guarded write in this codebase already use. A racing/duplicate
  // call for the same Pokémon (e.g. a retried request) can therefore never
  // create — or appear to create — a second pending evolution; it simply
  // matches zero rows and this returns null, exactly like the intentional
  // "already pending" no-op case above.
  const updated = await tx.playerPokemon.updateMany({
    where: { id: playerPokemonId, pendingEvolutionSpeciesId: null, evolutionPermanentlyBlocked: false },
    data: { pendingEvolutionSpeciesId: evolution.evolvesToSpeciesId },
  });

  return updated.count > 0 ? evolution.evolvesToSpeciesId : null;
}
