import "server-only";

import { rollCapture } from "@/engine/battle/capture";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";

export type AttemptCaptureResult =
  | { status: "captured"; speciesName: string }
  | { status: "failed" }
  | { status: "invalid-encounter" };

// Server-side capture resolution — the only place the capture RNG
// (rollCapture, engine/battle/capture.ts) is ever invoked, and the only
// place a PlayerPokemon row is created for a captured wild Pokémon. Reads
// the wild Pokémon's species/level/HP entirely from the caller's own
// persisted FieldBattleSession — never from client-supplied params — so
// there is nothing left for a client to lie about; a request can only ever
// say "attempt a capture right now", never which species/level/HP that
// capture is rolled against.
//
// Duplicate-request safety: a captured Pokémon is created and the session
// is ended inside one interactive transaction that deletes the session
// *first* and only creates the Pokémon if that delete actually removed a
// row. Postgres resolves a DELETE's WHERE clause after taking the row's
// lock, so two concurrent calls racing this same transaction can never
// both see a row to delete — the loser's deleteMany reports 0 rows and
// aborts before ever creating a second Pokémon from one throw.
export async function attemptCapture(userId: string): Promise<AttemptCaptureResult> {
  const profile = await getPlayerProfile(userId);
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId: profile.id } });

  if (!session) {
    return { status: "invalid-encounter" };
  }

  const species = getSpeciesById(session.wildSpeciesId);
  if (!species) {
    return { status: "invalid-encounter" };
  }

  const captured = rollCapture({
    currentHp: session.wildCurrentHp,
    maxHp: session.wildMaxHp,
    rarity: species.rarity,
  });

  if (!captured) {
    return { status: "failed" };
  }

  const didCapture = await prisma.$transaction(async (tx) => {
    const ended = await tx.fieldBattleSession.deleteMany({ where: { playerId: profile.id } });
    if (ended.count === 0) {
      // Already ended by a racing duplicate request (or some other
      // battle-ending action) — never create a second Pokémon from this
      // one throw.
      return false;
    }

    await tx.playerPokemon.create({
      data: {
        playerId: profile.id,
        speciesId: species.id,
        level: session.wildLevel,
        currentHp: session.wildCurrentHp,
        isStarter: false,
      },
    });

    return true;
  });

  if (!didCapture) {
    return { status: "invalid-encounter" };
  }

  return { status: "captured", speciesName: species.name };
}
