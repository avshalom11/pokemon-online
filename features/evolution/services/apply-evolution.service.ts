import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { evolutionSucceededMessage } from "@/features/evolution/messages/evolution-messages";
import { createNotification } from "@/features/notifications/services/notification-service";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PokemonSpecies } from "@/shared/types/pokemon";

export interface EvolutionHpOutcome {
  newMaxHp: number;
  newCurrentHp: number;
}

// The one place missing-HP-preserved evolution math is ever computed —
// shared by every accept-*.service.ts (level/Tyrogue/branch via
// accept-evolution.service.ts, evolution-item via
// accept-evolution-item.service.ts) so the rule can never
// drift between methods: missing HP (oldMaxHp - currentHp) is preserved
// exactly, then re-applied against the evolved species' own max HP — never
// a full heal. A fainted Pokémon (currentHp <= 0) stays at exactly 0;
// otherwise the result is clamped to at least 1 (an evolution can never
// itself reduce a conscious Pokémon to 0) and never above the new max.
export function calculateEvolutionHpOutcome(
  currentSpecies: PokemonSpecies,
  evolvedSpecies: PokemonSpecies,
  level: number,
  currentHp: number
): EvolutionHpOutcome {
  const oldMaxHp = calculatePokemonHpStat(currentSpecies.baseStats.health, level);
  const newMaxHp = calculatePokemonHpStat(evolvedSpecies.baseStats.health, level);
  const missingHp = Math.max(0, oldMaxHp - currentHp);

  const newCurrentHp = currentHp <= 0 ? 0 : Math.max(1, Math.min(newMaxHp, newMaxHp - missingHp));

  return { newMaxHp, newCurrentHp };
}

export interface ApplyEvolutionParams {
  tx: Prisma.TransactionClient;
  playerId: string;
  playerPokemonId: string;
  // Atomic check-and-set guard: the write only ever matches a row still on
  // this exact pre-evolution species — the same "still the pre-evolution
  // species" precondition accept-evolution-item.service.ts's own updateMany
  // already used before this helper existed.
  expectedCurrentSpeciesId: string;
  currentSpeciesName: string;
  evolvedSpecies: PokemonSpecies;
  newCurrentHp: number;
  // Level/Tyrogue/branch (accept-evolution.service.ts) additionally guard
  // on — and clear — pendingEvolutionSpeciesId; evolution-item evolution
  // never touches that column at all (an independent flow, per that
  // feature's own doc comment) and simply omits this.
  pendingEvolution?: { expectedPendingEvolutionSpeciesId: string };
}

// The one place a PlayerPokemon row's speciesId/currentHp is ever changed by
// a confirmed evolution, and the one place the POKEMON_EVOLVED notification
// is ever created for one — reused by every accept-*.service.ts instead of
// each reimplementing the same updateMany + notification pair (this
// phase's own "do not duplicate accept-evolution logic for every method"
// rule). Ownership is encoded directly in the WHERE clause; a racing/
// duplicate confirmation for the same Pokémon can only ever apply once —
// the loser's updateMany matches zero rows and this returns false, exactly
// like accept-evolution.service.ts and accept-evolution-item.service.ts's
// own pre-existing race guards already behaved.
export async function applyEvolutionToPlayerPokemon(params: ApplyEvolutionParams): Promise<boolean> {
  const { tx, playerId, playerPokemonId, expectedCurrentSpeciesId, currentSpeciesName, evolvedSpecies, newCurrentHp, pendingEvolution } = params;

  const where: Prisma.PlayerPokemonWhereInput = {
    id: playerPokemonId,
    playerId,
    speciesId: expectedCurrentSpeciesId,
  };
  if (pendingEvolution) {
    where.pendingEvolutionSpeciesId = pendingEvolution.expectedPendingEvolutionSpeciesId;
  }

  const updated = await tx.playerPokemon.updateMany({
    where,
    data: {
      speciesId: evolvedSpecies.id,
      currentHp: newCurrentHp,
      ...(pendingEvolution ? { pendingEvolutionSpeciesId: null } : {}),
    },
  });

  if (updated.count === 0) {
    return false;
  }

  await createNotification(tx, playerId, "POKEMON_EVOLVED", evolutionSucceededMessage(currentSpeciesName, evolvedSpecies.name));

  return true;
}
