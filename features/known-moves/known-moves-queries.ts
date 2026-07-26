import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  getKnownMoveIds as pureGetKnownMoveIds,
  getResolvedKnownMoves as pureGetResolvedKnownMoves,
  isMoveKnown as pureIsMoveKnown,
  getKnownMoveCount as pureGetKnownMoveCount,
  isKnownMoveSetFull as pureIsKnownMoveSetFull,
  hasAvailableKnownMoveSlot as pureHasAvailableKnownMoveSlot,
} from "@/engine/known-moves";
import type { KnownMove, KnownMoveSet } from "@/engine/known-moves";
import type { Move } from "@/engine/moves";

// Read-only Prisma access for one owned Pokémon's known moves. Every
// helper here loads the PlayerKnownMove rows and immediately delegates to
// the pure engine/known-moves query of the same name — the actual
// slot/full/available-slot logic exists exactly once, in the engine.
// Resolved Move data (name, type, power, ...) always comes from the
// static move registry, never a database read — Moves are static game
// data (engine/moves), not per-owned-Pokémon state.
async function loadKnownMoveSet(playerPokemonId: string): Promise<KnownMoveSet> {
  return prisma.playerKnownMove.findMany({
    where: { playerPokemonId },
    orderBy: { slot: "asc" },
    select: { moveId: true, slot: true },
  });
}

export async function getKnownMoves(playerPokemonId: string): Promise<KnownMove[]> {
  return loadKnownMoveSet(playerPokemonId);
}

export async function getKnownMoveIds(playerPokemonId: string): Promise<string[]> {
  return pureGetKnownMoveIds(await loadKnownMoveSet(playerPokemonId));
}

export async function getResolvedKnownMoves(playerPokemonId: string): Promise<Move[]> {
  return pureGetResolvedKnownMoves(await loadKnownMoveSet(playerPokemonId));
}

export async function isMoveKnown(playerPokemonId: string, moveId: string): Promise<boolean> {
  return pureIsMoveKnown(await loadKnownMoveSet(playerPokemonId), moveId);
}

export async function getKnownMoveCount(playerPokemonId: string): Promise<number> {
  return pureGetKnownMoveCount(await loadKnownMoveSet(playerPokemonId));
}

export async function isKnownMoveSetFull(playerPokemonId: string): Promise<boolean> {
  return pureIsKnownMoveSetFull(await loadKnownMoveSet(playerPokemonId));
}

export async function hasAvailableKnownMoveSlot(playerPokemonId: string): Promise<boolean> {
  return pureHasAvailableKnownMoveSlot(await loadKnownMoveSet(playerPokemonId));
}
