import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getSpeciesById, getStarterSpecies } from "@/features/pokemon/services/species-catalog";
import { createOwnedPokemon } from "@/features/pokemon/services/create-owned-pokemon.service";
import { getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";

const STARTER_LEVEL = 5;

export type SelectStarterResult =
  | { status: "created" }
  | { status: "already-completed" }
  | { status: "invalid-species" };

// Entirely server-side: verifies the species is an allowed starter, then
// runs a single transaction that (a) flips onboardingCompleted only if it
// was still false, and (b) creates the PlayerPokemon row — both guarded by
// the same transaction, so a refresh, resubmission, or concurrent double
// request can never create two starters. Postgres serializes the guarded
// updateMany against concurrent transactions on the same row, which is what
// actually makes this safe, not just the onboardingCompleted check by itself.
export async function selectStarterPokemon(userId: string, speciesId: string): Promise<SelectStarterResult> {
  const isAllowedStarter = getStarterSpecies().some((species) => species.id === speciesId);
  const species = isAllowedStarter ? getSpeciesById(speciesId) : undefined;

  if (!species) {
    return { status: "invalid-species" };
  }

  const profile = await prisma.playerProfile.findUniqueOrThrow({
    where: { userId },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const guardedUpdate = await tx.playerProfile.updateMany({
      where: { id: profile.id, onboardingCompleted: false },
      data: { onboardingCompleted: true, starterPokemonId: speciesId },
    });

    if (guardedUpdate.count === 0) {
      return { status: "already-completed" };
    }

    // createOwnedPokemon (shared with capture.service.ts) also assigns
    // this Pokémon's starting known moves in the same transaction — see
    // that function's doc comment for why this must never be duplicated
    // as a second, separate call site.
    await createOwnedPokemon(tx, {
      playerId: profile.id,
      speciesId,
      level: STARTER_LEVEL,
      // See capture.service.ts's identical comment: this is only the
      // total-XP baseline consistent with STARTER_LEVEL, never a granted
      // reward, so the starter's first real battle-XP grant increases its
      // level rather than implicitly resetting it from experience: 0.
      experience: getTotalXpRequiredForPokemonLevel(STARTER_LEVEL),
      currentHp: species.baseStats.health,
      isStarter: true,
      // New players always have an empty party, so slot 1 (the battle
      // starter) is guaranteed free here.
      partySlot: 1,
      source: "starter",
    });

    return { status: "created" };
  });
}
