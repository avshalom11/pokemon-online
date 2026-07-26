import "server-only";

import { prisma } from "@/lib/db/prisma";
import * as KnownMoves from "@/engine/known-moves";
import type { KnownMoveOperationResult, KnownMoveSet } from "@/engine/known-moves";
import type { Prisma } from "@/lib/generated/prisma/client";

// Prisma-backed known-move operations for one owned Pokémon
// (PlayerPokemon). Each function here loads the current set, runs the
// matching pure engine/known-moves operation against it, and — only on
// success — persists the result, all inside one transaction. The actual
// add/replace/remove/reorder rules (duplicate/full/slot/reorder-mismatch
// checks) live exactly once, in the engine; this file is purely the
// read-current / call-engine / write-result plumbing.

// Exported so other features that already hold a transaction (e.g.
// features/move-learning, which needs a Pokémon's current Known Moves as
// planning input inside its own atomic XP/level-up write) can read the
// current set without a second, out-of-transaction query.
export async function loadKnownMoveSet(tx: Prisma.TransactionClient, playerPokemonId: string): Promise<KnownMoveSet> {
  return tx.playerKnownMove.findMany({
    where: { playerPokemonId },
    orderBy: { slot: "asc" },
    select: { moveId: true, slot: true },
  });
}

// Full replace, not an incremental diff: every existing row for this
// Pokémon is deleted and the new set is recreated from scratch. Simpler
// and always correct — an incremental update risks transiently violating
// the (playerPokemonId, slot) unique constraint while compacting slots
// (e.g. moving a move from slot 3 to slot 2 while another row still
// briefly occupies slot 2) unless carefully ordered; delete-then-recreate
// sidesteps that entirely and costs nothing extra since every operation
// here already needs to compute the *whole* new set anyway.
async function persistKnownMoveSet(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  knownMoves: KnownMoveSet
): Promise<void> {
  await tx.playerKnownMove.deleteMany({ where: { playerPokemonId } });

  if (knownMoves.length > 0) {
    await tx.playerKnownMove.createMany({
      data: knownMoves.map((move) => ({
        playerPokemonId,
        moveId: move.moveId,
        slot: move.slot,
      })),
    });
  }
}

// Runs one mutation atomically against an *already-open* transaction:
// verifies the owned Pokémon exists, computes the result via the pure
// engine operation, and persists it only when that result is a success —
// an invalid operation (full set, duplicate move, bad slot, ...) never
// writes anything, since the whole read-compute-write happens inside the
// caller's transaction and a non-"success" result simply returns without
// calling persistKnownMoveSet.
//
// Exported (not just an internal helper of runMutation below) so other
// features that already hold a transaction can apply a Known Move change
// as part of their own larger atomic write, instead of this module
// opening a second, nested transaction. features/move-learning's
// applyLevelUpMoveLearning is the first such caller: it needs Known Move
// writes to commit or roll back together with the XP/level update and any
// Pending Move Learning rows in the very same transaction.
export async function applyKnownMoveMutation(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  mutate: (current: KnownMoveSet) => KnownMoveOperationResult
): Promise<KnownMoveOperationResult> {
  const owner = await tx.playerPokemon.findUnique({
    where: { id: playerPokemonId },
    select: { id: true },
  });

  if (!owner) {
    return { status: "ownedPokemonNotFound", ownedPokemonId: playerPokemonId };
  }

  const current = await loadKnownMoveSet(tx, playerPokemonId);
  const result = mutate(current);

  if (result.status !== "success") {
    return result;
  }

  await persistKnownMoveSet(tx, playerPokemonId, result.knownMoves);
  return result;
}

// Opens its own transaction and delegates to applyKnownMoveMutation —
// what every top-level export in this file below uses. Callers that
// already hold a transaction (see applyKnownMoveMutation's own doc
// comment) should call that directly instead of these.
async function runMutation(
  playerPokemonId: string,
  mutate: (current: KnownMoveSet) => KnownMoveOperationResult
): Promise<KnownMoveOperationResult> {
  return prisma.$transaction((tx) => applyKnownMoveMutation(tx, playerPokemonId, mutate));
}

export async function setKnownMoves(
  playerPokemonId: string,
  moveIds: readonly string[]
): Promise<KnownMoveOperationResult> {
  return runMutation(playerPokemonId, () => KnownMoves.buildKnownMoveSet(moveIds));
}

export async function addKnownMove(playerPokemonId: string, moveId: string): Promise<KnownMoveOperationResult> {
  return runMutation(playerPokemonId, (current) => KnownMoves.addKnownMove(current, moveId));
}

export async function replaceKnownMove(
  playerPokemonId: string,
  slot: number,
  newMoveId: string
): Promise<KnownMoveOperationResult> {
  return runMutation(playerPokemonId, (current) => KnownMoves.replaceKnownMove(current, slot, newMoveId));
}

export async function removeKnownMove(playerPokemonId: string, slot: number): Promise<KnownMoveOperationResult> {
  return runMutation(playerPokemonId, (current) => KnownMoves.removeKnownMove(current, slot));
}

export async function reorderKnownMoves(
  playerPokemonId: string,
  orderedMoveIds: readonly string[]
): Promise<KnownMoveOperationResult> {
  return runMutation(playerPokemonId, (current) => KnownMoves.reorderKnownMoves(current, orderedMoveIds));
}
