import "server-only";

import { getStartingKnownMoves } from "@/engine/known-moves";
import type { Prisma, PlayerPokemon } from "@/lib/generated/prisma/client";

export interface CreateOwnedPokemonParams {
  playerId: string;
  speciesId: string;
  level: number;
  experience: number;
  currentHp: number;
  isStarter: boolean;
  partySlot?: number | null;
}

export interface CreateOwnedPokemonResult {
  pokemon: PlayerPokemon;
  knownMoveIds: string[];
}

// The one place a PlayerPokemon row is created — both starter selection
// (features/onboarding/services/select-starter.service.ts) and wild
// capture (features/battle/services/capture.service.ts) call this instead
// of `tx.playerPokemon.create` directly, so "every newly created owned
// Pokémon gets its starting known moves" can never be forgotten by a
// future third creation path, and the starting-move logic itself exists
// exactly once (engine/known-moves's getStartingKnownMoves).
//
// Always takes an existing transaction client rather than opening its own
// (mirrors features/pokemon-progression/pokemon-progression-service.ts's
// applyPokemonXpGrant) so the Pokémon row and its known-move rows are
// created atomically — a caller can never observe a Pokémon that
// transiently has none of the moves it should have started with.
export async function createOwnedPokemon(
  tx: Prisma.TransactionClient,
  params: CreateOwnedPokemonParams
): Promise<CreateOwnedPokemonResult> {
  const pokemon = await tx.playerPokemon.create({
    data: {
      playerId: params.playerId,
      speciesId: params.speciesId,
      level: params.level,
      experience: params.experience,
      currentHp: params.currentHp,
      isStarter: params.isStarter,
      partySlot: params.partySlot ?? null,
    },
  });

  const knownMoveIds = getStartingKnownMoves(params.speciesId, params.level);

  if (knownMoveIds.length > 0) {
    await tx.playerKnownMove.createMany({
      data: knownMoveIds.map((moveId, index) => ({
        playerPokemonId: pokemon.id,
        moveId,
        slot: index + 1,
      })),
    });
  }

  return { pokemon, knownMoveIds };
}
