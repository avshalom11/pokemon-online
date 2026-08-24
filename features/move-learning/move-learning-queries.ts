import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getMoveById } from "@/engine/moves";
import type { Move } from "@/engine/moves";
import type { PendingMoveLearning, PendingMoveLearningRecord } from "@/engine/move-learning";

// Read-only Prisma access for one owned Pokémon's Pending Move Learning
// decisions. Every helper here only ever considers *unresolved*
// ("pending") rows — a "learned" or "declined" row is history, not a
// current opportunity. Ordered by learnedAtLevel ascending, then
// `sequence` ascending (see the Prisma model's own doc comment for why
// `sequence` exists instead of trusting createdAt precision) — this is
// the deterministic order PENDING DECISION ORDER requires. Move metadata
// is always resolved from the static move registry, never a database
// read — Moves are static game data (engine/moves), not per-Pokémon
// state.
async function loadPendingRows(playerPokemonId: string) {
  return prisma.playerPendingMoveLearning.findMany({
    where: { playerPokemonId, status: "pending" },
    orderBy: [{ learnedAtLevel: "asc" }, { sequence: "asc" }],
    select: { moveId: true, learnedAtLevel: true, status: true },
  });
}

export async function getPendingMoveLearnings(playerPokemonId: string): Promise<PendingMoveLearning[]> {
  const rows = await loadPendingRows(playerPokemonId);
  return rows.map((row) => ({ moveId: row.moveId, learnedAtLevel: row.learnedAtLevel, status: row.status as "pending" }));
}

export async function getPendingMoveLearningIds(playerPokemonId: string): Promise<string[]> {
  const rows = await loadPendingRows(playerPokemonId);
  return rows.map((row) => row.moveId);
}

export async function getResolvedPendingMoveLearnings(
  playerPokemonId: string
): Promise<Array<{ moveId: string; learnedAtLevel: number; move: Move | undefined }>> {
  const rows = await loadPendingRows(playerPokemonId);
  return rows.map((row) => ({
    moveId: row.moveId,
    learnedAtLevel: row.learnedAtLevel,
    move: getMoveById(row.moveId),
  }));
}

export async function hasPendingMoveLearning(playerPokemonId: string, moveId: string): Promise<boolean> {
  const existing = await prisma.playerPendingMoveLearning.findFirst({
    where: { playerPokemonId, moveId, status: "pending" },
    select: { id: true },
  });
  return existing !== null;
}

export async function getPendingMoveLearningCount(playerPokemonId: string): Promise<number> {
  return prisma.playerPendingMoveLearning.count({
    where: { playerPokemonId, status: "pending" },
  });
}

export async function hasAnyPendingMoveLearning(playerPokemonId: string): Promise<boolean> {
  const count = await getPendingMoveLearningCount(playerPokemonId);
  return count > 0;
}

// Phase 4E additions — resolving pending decisions needs the actual row
// id (to resolve/decline by) and needs to always pick the single
// earliest-in-creation-order unresolved decision, never let a later one
// jump the queue.

// The one pending decision that should be resolved next for this
// Pokémon, in the same deterministic order as loadPendingRows above
// (learnedAtLevel ascending, then `sequence` ascending) — or undefined if
// none are unresolved. "Always resolve them in creation order" (Phase 4E
// rule) means callers should never let a player pick an arbitrary pending
// row to act on; this is the only one exposed at a time.
export async function getNextPendingMove(playerPokemonId: string): Promise<PendingMoveLearningRecord | undefined> {
  const row = await prisma.playerPendingMoveLearning.findFirst({
    where: { playerPokemonId, status: "pending" },
    orderBy: [{ learnedAtLevel: "asc" }, { sequence: "asc" }],
    select: { id: true, playerPokemonId: true, moveId: true, learnedAtLevel: true, status: true },
  });

  return row
    ? { id: row.id, playerPokemonId: row.playerPokemonId, moveId: row.moveId, learnedAtLevel: row.learnedAtLevel, status: row.status as "pending" }
    : undefined;
}

// Thin, exact-name-matching wrapper over hasAnyPendingMoveLearning above
// — kept as a separate export (rather than renaming the Phase 4D
// original) so both names stay valid and nothing that already imports
// hasAnyPendingMoveLearning has to change.
export async function hasPendingMoves(playerPokemonId: string): Promise<boolean> {
  return hasAnyPendingMoveLearning(playerPokemonId);
}

// MOVE LEARNING UX — the account-wide counterpart to getNextPendingMove:
// which OWNED POKÉMON (any of them, not one caller already knows about)
// has the earliest unresolved Pending Move Learning decision. Same "Home
// safety net" role as features/evolution/queries/evolution-queries.ts's
// getFirstPendingEvolutionView (findFirst, ordered so the earliest-created
// decision wins) — the actual per-Pokémon "which move, which slot options"
// detail is still assembled by move-learning-view.service.ts's
// getPendingMoveLearningView once this resolves which Pokémon to ask.
//
// Two steps (this player's own owned-Pokémon ids, then the earliest
// pending row among them) rather than one relational query, since
// PlayerPendingMoveLearning has no playerId column of its own — only
// playerPokemonId. Ordered by `sequence` alone (not learnedAtLevel first):
// `sequence` is a single table-wide autoincrement, already assigned in the
// exact order applyLevelUpMoveLearning created each pending row —
// including, for one Pokémon's own rows, the same learnedAtLevel-ascending
// order getNextPendingMove itself sorts by. Ordering the account-wide pick
// by sequence alone therefore reduces to "resolve pending decisions in the
// order they were created" everywhere, which is exactly PENDING DECISION
// ORDER's rule, without needing a second, Pokémon-scoped sort key here.
export async function getFirstPendingMoveLearningPlayerPokemonId(playerId: string): Promise<string | null> {
  const ownedPokemon = await prisma.playerPokemon.findMany({ where: { playerId }, select: { id: true } });
  if (ownedPokemon.length === 0) return null;

  const row = await prisma.playerPendingMoveLearning.findFirst({
    where: { status: "pending", playerPokemonId: { in: ownedPokemon.map((pokemon) => pokemon.id) } },
    orderBy: { sequence: "asc" },
    select: { playerPokemonId: true },
  });
  return row?.playerPokemonId ?? null;
}
