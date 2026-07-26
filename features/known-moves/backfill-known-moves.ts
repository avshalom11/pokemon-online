import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getStartingKnownMoves } from "@/engine/known-moves";

export interface BackfillKnownMovesReport {
  totalPlayerPokemon: number;
  backfilled: number;
  skippedAlreadyHasMoves: number;
  // playerPokemonIds that had zero known moves *and* zero eligible
  // starting moves to backfill (e.g. a species with no level-up moves at
  // its current level) — left untouched rather than assigned a fabricated
  // move.
  skippedNoEligibleMoves: string[];
}

// Idempotent by construction: only ever selects PlayerPokemon rows that
// currently have zero PlayerKnownMove rows (`knownMoves: { none: {} }`),
// and only ever *creates* rows for those — it never reads, modifies, or
// deletes an existing PlayerKnownMove row. Running it twice in a row
// finds nothing left to do on the second run and reports
// `backfilled: 0`. Safe to run repeatedly; never destructive.
export async function backfillKnownMoves(): Promise<BackfillKnownMovesReport> {
  const totalPlayerPokemon = await prisma.playerPokemon.count();

  const candidates = await prisma.playerPokemon.findMany({
    where: { knownMoves: { none: {} } },
    select: { id: true, speciesId: true, level: true },
  });

  let backfilled = 0;
  const skippedNoEligibleMoves: string[] = [];

  for (const pokemon of candidates) {
    const startingMoveIds = getStartingKnownMoves(pokemon.speciesId, pokemon.level);

    if (startingMoveIds.length === 0) {
      skippedNoEligibleMoves.push(pokemon.id);
      continue;
    }

    await prisma.playerKnownMove.createMany({
      data: startingMoveIds.map((moveId, index) => ({
        playerPokemonId: pokemon.id,
        moveId,
        slot: index + 1,
      })),
    });
    backfilled++;
  }

  return {
    totalPlayerPokemon,
    backfilled,
    skippedAlreadyHasMoves: totalPlayerPokemon - candidates.length,
    skippedNoEligibleMoves,
  };
}
