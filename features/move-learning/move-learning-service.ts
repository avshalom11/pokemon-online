import "server-only";

import { planLevelUpMoveLearning } from "@/engine/move-learning";
import type { MoveLearningApplyResult, ResolvePendingMoveLearnResult, DeclinePendingMoveResult } from "@/engine/move-learning";
import { buildKnownMoveSet, replaceKnownMove } from "@/engine/known-moves";
import type { KnownMoveId } from "@/engine/known-moves";
import { applyKnownMoveMutation, loadKnownMoveSet } from "@/features/known-moves/known-moves-service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

async function loadExistingPendingMoveIds(
  tx: Prisma.TransactionClient,
  playerPokemonId: string
): Promise<KnownMoveId[]> {
  const rows = await tx.playerPendingMoveLearning.findMany({
    where: { playerPokemonId, status: "pending" },
    select: { moveId: true },
  });
  return rows.map((row) => row.moveId);
}

// Inserts one Pending Move Learning row. Exposed standalone (not just
// inlined in applyLevelUpMoveLearning below) since it's a reusable
// primitive in its own right — always call it from inside an existing
// transaction; it never opens one itself, same convention as
// features/known-moves' applyKnownMoveMutation.
//
// The (playerPokemonId, moveId, status) unique constraint is the
// database-level backstop against a duplicate *unresolved* row (see the
// PlayerPendingMoveLearning model's own doc comment for why that specific
// column combination is what makes this work without a partial index);
// this function treats a unique-constraint violation as "already
// pending" rather than letting a raw Prisma error escape — the caller
// should still avoid calling this for a move it already knows is
// pending, since applyLevelUpMoveLearning's plan already filters those
// out, but retries/races land here safely regardless.
export async function createPendingMoveLearning(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  moveId: string,
  learnedAtLevel: number
): Promise<MoveLearningApplyResult | { status: "success" }> {
  try {
    await tx.playerPendingMoveLearning.create({
      data: { playerPokemonId, moveId, learnedAtLevel, status: "pending" },
    });
    return { status: "success" };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      // Already pending (a concurrent/retried call beat this one to it) —
      // not an error from the caller's point of view.
      return { status: "success" };
    }
    throw error;
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// The main move-learning operation: given an owned Pokémon's species and
// the level range it just moved through, plans and persists every
// automatic Known Move and every new Pending Move Learning decision in
// one atomic pass. Always takes an existing transaction client — never
// opens its own — so it can run as part of the same atomic write that
// persists a Pokémon's new XP and level (see
// features/pokemon-progression/pokemon-progression-service.ts's
// applyPokemonXpGrant, the one caller of this function today).
//
// Idempotency: calling this twice with the same (playerPokemonId,
// speciesId, oldLevel, newLevel) — e.g. a retried request — produces the
// same result both times without duplicating anything. The second call
// reads the *already-updated* Known Moves and Pending Move Learning rows
// from the first call, so the plan it computes finds every move from the
// first call already known or already pending and does nothing further;
// the (playerPokemonId, moveId) uniqueness on both PlayerKnownMove and
// PlayerPendingMoveLearning is the final backstop if two calls ever
// somehow race concurrently instead of sequentially.
export async function applyLevelUpMoveLearning(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  speciesId: string,
  oldLevel: number,
  newLevel: number
): Promise<MoveLearningApplyResult> {
  const owner = await tx.playerPokemon.findUnique({
    where: { id: playerPokemonId },
    select: { id: true },
  });

  if (!owner) {
    return { status: "ownedPokemonNotFound", ownedPokemonId: playerPokemonId };
  }

  const [currentKnownMoves, existingPendingMoveIds] = await Promise.all([
    loadKnownMoveSet(tx, playerPokemonId),
    loadExistingPendingMoveIds(tx, playerPokemonId),
  ]);

  const currentKnownMoveIds = [...currentKnownMoves].sort((a, b) => a.slot - b.slot).map((move) => move.moveId);

  const planResult = planLevelUpMoveLearning({
    pokemonId: speciesId,
    oldLevel,
    newLevel,
    currentKnownMoveIds,
    existingPendingMoveIds,
  });

  if (planResult.status !== "success") {
    return planResult;
  }

  const { plan } = planResult;

  if (plan.automaticallyLearnedMoveIds.length > 0) {
    const knownMoveResult = await applyKnownMoveMutation(tx, playerPokemonId, () =>
      buildKnownMoveSet(plan.finalKnownMoveIds)
    );

    if (knownMoveResult.status !== "success") {
      // Should be unreachable: the plan was computed from this exact
      // Known Move state a moment ago inside the same transaction, and
      // buildKnownMoveSet's own rules (max four, no duplicates, all real
      // moves) are exactly what the planner already enforced. Surfaced as
      // a structured conflict rather than silently dropping the
      // automatic learns.
      return { status: "persistenceConflict", message: `known-move mutation failed: ${knownMoveResult.status}` };
    }
  }

  for (const pending of plan.pendingMoves) {
    const result = await createPendingMoveLearning(tx, playerPokemonId, pending.moveId, pending.learnedAtLevel);
    if (result.status !== "success") {
      return result;
    }
  }

  return { status: "success", plan };
}

// ===========================================================================
// Phase 4E — resolving an existing Pending Move Learning decision
// ===========================================================================
//
// Both operations below open their own transaction (unlike
// applyLevelUpMoveLearning above, which is only ever called from *inside*
// applyPokemonXpGrant's transaction) — resolving a pending decision is
// always its own standalone action from a player's point of view (a
// button press on a "learn or decline" prompt), never a step inside a
// larger XP/level write.

// "Learn" is always a slot *replacement* — RULES: "Learning a pending
// move never creates a fifth Known Move... Player selects one existing
// Known Move slot. That move is replaced. The pending move occupies the
// same slot." There is deliberately no "append if a slot happens to be
// free" branch: replaceKnownMove (engine/known-moves, unchanged from
// Phase 4C) already implements exactly this rule, including "slot must
// exist" / "slot must belong to this Pokémon" (via reading that
// Pokémon's own Known Moves first) and "Known Move ordering must remain
// stable" (every other slot is left untouched).
//
// Atomic: the pending row is only ever marked "learned" if the Known
// Move replacement itself succeeded, and both writes are inside the same
// transaction — a failure partway through leaves neither the Known Move
// nor the pending row changed.
export async function resolvePendingMoveLearn(pendingId: string, slot: number): Promise<ResolvePendingMoveLearnResult> {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.playerPendingMoveLearning.findUnique({ where: { id: pendingId } });

    if (!pending) {
      return { status: "pendingNotFound", pendingId };
    }
    if (pending.status !== "pending") {
      return { status: "pendingAlreadyResolved", pendingId, currentStatus: pending.status as "learned" | "declined" };
    }

    const replaceResult = await applyKnownMoveMutation(tx, pending.playerPokemonId, (current) =>
      replaceKnownMove(current, slot, pending.moveId)
    );

    if (replaceResult.status !== "success") {
      // ResolvePendingMoveLearnResult includes the full
      // KnownMoveOperationFailure union, so every non-success shape
      // applyKnownMoveMutation can produce is returned as-is — no
      // translation needed (see that type's own doc comment).
      return replaceResult;
    }

    await tx.playerPendingMoveLearning.update({
      where: { id: pendingId },
      data: { status: "learned", resolvedAt: new Date() },
    });

    return {
      status: "success",
      knownMoves: replaceResult.knownMoves,
      pendingId,
      playerPokemonId: pending.playerPokemonId,
    };
  });
}

// "Decline" never touches Known Moves — only the pending row's own
// status changes, from "pending" to "declined". Per PENDING STATUS:
// "Resolved pending moves must never appear again" — every read query in
// move-learning-queries.ts already filters to status: "pending" only, so
// a declined row simply stops being returned by any of them from this
// point on; it is not deleted (kept as a permanent historical record).
export async function declinePendingMove(pendingId: string): Promise<DeclinePendingMoveResult> {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.playerPendingMoveLearning.findUnique({ where: { id: pendingId } });

    if (!pending) {
      return { status: "pendingNotFound", pendingId };
    }
    if (pending.status !== "pending") {
      return { status: "pendingAlreadyResolved", pendingId, currentStatus: pending.status as "learned" | "declined" };
    }

    await tx.playerPendingMoveLearning.update({
      where: { id: pendingId },
      data: { status: "declined", resolvedAt: new Date() },
    });

    return { status: "success", pendingId, playerPokemonId: pending.playerPokemonId };
  });
}
