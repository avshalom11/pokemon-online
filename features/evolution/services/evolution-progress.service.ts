import "server-only";

import { getBranchEvolution, resolvePendingEvolutionEligibility } from "@/data/pokemon/pokemon-evolutions";
import { calculatePokemonNonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
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
// Covers every method that shares the pendingEvolutionSpeciesId/
// pendingEvolutionBranch/evolutionPermanentlyBlocked confirmation flow
// (level, Tyrogue's level-stat branch, and Eevee's explicit branch choice —
// see data/pokemon/pokemon-evolutions.ts's resolvePendingEvolutionEligibility,
// the single source both this function and accept-evolution.service.ts's
// own re-validation read). Evolution-item evolutions are deliberately never
// checked here — they have their own independent, Inventory-initiated flow
// and must never trigger from a level-up.
//
// Never chains past one stage: this only ever checks the Pokémon's
// CURRENT (pre-transaction) speciesId/level, and the resolver itself is
// only ever one step deep per species. A Charmander that jumps straight to
// level 40 in one grant is offered Charmeleon (its own next stage) only —
// Charizard's threshold is irrelevant until Charmeleon has actually been
// accepted in a *later*, separate call, which will then see the (by-then-
// updated) speciesId "charmeleon" and look up *its* own next stage. This is
// what makes "do not skip stages" true without any special-casing here.
//
// Returns a no-op result ({ pendingEvolutionSpeciesId: null,
// pendingEvolutionBranch: false }) whenever any of these hold — species has
// no eligible evolution right now, a pending decision (single or branch)
// already exists for this Pokémon, or evolution was permanently rejected
// for it — so a caller can always call this unconditionally on every XP
// grant, exactly like applyLevelUpMoveLearning already is, with no separate
// "should I even check" branch needed.
export interface PendingEvolutionCreationResult {
  pendingEvolutionSpeciesId: string | null;
  pendingEvolutionBranch: boolean;
}

const NO_PENDING_EVOLUTION_CREATED: PendingEvolutionCreationResult = {
  pendingEvolutionSpeciesId: null,
  pendingEvolutionBranch: false,
};

export async function tryCreatePendingEvolution(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  currentSpeciesId: string,
  newLevel: number,
  pendingEvolutionSpeciesId: string | null,
  pendingEvolutionBranch: boolean,
  evolutionPermanentlyBlocked: boolean
): Promise<PendingEvolutionCreationResult> {
  if (pendingEvolutionSpeciesId !== null || pendingEvolutionBranch || evolutionPermanentlyBlocked) {
    return NO_PENDING_EVOLUTION_CREATED;
  }

  const species = getSpeciesById(currentSpeciesId);
  if (!species) {
    return NO_PENDING_EVOLUTION_CREATED;
  }

  // Tyrogue's own branch is the only consumer of these two today, but
  // computing them unconditionally is cheap and keeps this call site
  // ignorant of which method (if any) actually needs them.
  const attackStat = calculatePokemonNonHpStat(species.baseStats.attack, newLevel);
  const defenseStat = calculatePokemonNonHpStat(species.baseStats.defense, newLevel);

  const eligibility = resolvePendingEvolutionEligibility({ speciesId: currentSpeciesId, level: newLevel, attackStat, defenseStat });

  if (!eligibility) {
    return NO_PENDING_EVOLUTION_CREATED;
  }

  // Atomic check-and-set: the precondition (still no pending decision, not
  // blocked) is encoded directly in the WHERE clause, same idiom
  // currency-reward.service.ts's spendCurrency and every other
  // race-guarded write in this codebase already use. A racing/duplicate
  // call for the same Pokémon (e.g. a retried request) can therefore never
  // create — or appear to create — a second pending evolution (single or
  // branch); it simply matches zero rows and this returns the same no-op
  // result as the intentional "already pending" no-op case above.
  const where = { id: playerPokemonId, pendingEvolutionSpeciesId: null, pendingEvolutionBranch: false, evolutionPermanentlyBlocked: false };

  if (eligibility.kind === "single") {
    const updated = await tx.playerPokemon.updateMany({ where, data: { pendingEvolutionSpeciesId: eligibility.targetSpeciesId } });
    return updated.count > 0
      ? { pendingEvolutionSpeciesId: eligibility.targetSpeciesId, pendingEvolutionBranch: false }
      : NO_PENDING_EVOLUTION_CREATED;
  }

  // Branch (Eevee only, today): no target is chosen automatically — this
  // only flags that the player now has an explicit choice to make (see
  // chooseEvolutionBranch below), never sets pendingEvolutionSpeciesId
  // itself. "do not create two simultaneous pending evolution rows": the
  // WHERE clause above guarantees pendingEvolutionSpeciesId and
  // pendingEvolutionBranch can never both be set for the same row at once.
  const updated = await tx.playerPokemon.updateMany({ where, data: { pendingEvolutionBranch: true } });
  return updated.count > 0 ? { pendingEvolutionSpeciesId: null, pendingEvolutionBranch: true } : NO_PENDING_EVOLUTION_CREATED;
}

export type ChooseEvolutionBranchResult =
  | { status: "success"; chosenSpeciesId: string }
  | { status: "not-owned" }
  | { status: "no-pending-branch" }
  | { status: "invalid-target" };

// The one place a player's explicit Branch Evolution choice (Eevee's
// Espeon/Umbreon fork today, extensible to any future species with more
// than one BRANCH_EVOLUTIONS target) is ever resolved into a normal,
// single-target pending evolution — after this succeeds, the Pokémon's row
// looks exactly like any other level evolution's pending state
// (pendingEvolutionSpeciesId set, pendingEvolutionBranch cleared), so the
// existing acceptEvolution/rejectEvolution flow (features/evolution/
// services/accept-evolution.service.ts, reject-evolution.service.ts) needs
// no branch-specific code at all from this point on — this function is the
// ENTIRE branch-specific surface.
//
// `chosenSpeciesId` is always re-validated against the canonical
// BRANCH_EVOLUTIONS target list for this Pokémon's CURRENT species (never
// trusted from the client as-is), so a client can only ever pick one of the
// real options, never invent a third target.
export async function chooseEvolutionBranch(
  playerId: string,
  playerPokemonId: string,
  chosenSpeciesId: string
): Promise<ChooseEvolutionBranchResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });
  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (!pokemon.pendingEvolutionBranch) {
    return { status: "no-pending-branch" };
  }

  const branchEvolution = getBranchEvolution(pokemon.speciesId);
  if (!branchEvolution || !branchEvolution.targets.includes(chosenSpeciesId)) {
    return { status: "invalid-target" };
  }

  // Same atomic check-and-set idiom as tryCreatePendingEvolution above — a
  // racing/duplicate choose call for the same Pokémon can only ever apply
  // once; the loser matches zero rows.
  const updated = await prisma.playerPokemon.updateMany({
    where: { id: playerPokemonId, pendingEvolutionBranch: true },
    data: { pendingEvolutionSpeciesId: chosenSpeciesId, pendingEvolutionBranch: false },
  });

  if (updated.count === 0) {
    return { status: "no-pending-branch" };
  }

  return { status: "success", chosenSpeciesId };
}
