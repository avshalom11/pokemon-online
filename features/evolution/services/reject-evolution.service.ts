import "server-only";

import { prisma } from "@/lib/db/prisma";

export type RejectEvolutionResult =
  | { status: "success"; playerPokemonId: string }
  | { status: "not-owned" }
  | { status: "no-pending-evolution" };

// Server-side resolution of a rejected evolution — permanent, per this
// phase's own explicit rule: the species is left completely unchanged, the
// pending decision is cleared, and evolutionPermanentlyBlocked is set to
// true and never cleared by anything afterward (not a later level, not a
// later battle, not a refresh, not a later stage of the same family — see
// this column's own doc comment in prisma/schema.prisma). Ownership and
// the pending decision's continued existence are re-validated here, never
// trusted from the client. No notification is ever created here (only a
// successful accept notifies — see accept-evolution.service.ts).
export async function rejectEvolution(playerId: string, playerPokemonId: string): Promise<RejectEvolutionResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (!pokemon.pendingEvolutionSpeciesId) {
    return { status: "no-pending-evolution" };
  }

  // Same atomic check-and-set precondition as accept-evolution.service.ts's
  // own updateMany — a racing/duplicate reject for the same Pokémon can
  // only ever apply once.
  const updated = await prisma.playerPokemon.updateMany({
    where: { id: playerPokemonId, pendingEvolutionSpeciesId: pokemon.pendingEvolutionSpeciesId },
    data: { pendingEvolutionSpeciesId: null, evolutionPermanentlyBlocked: true },
  });

  if (updated.count === 0) {
    return { status: "no-pending-evolution" };
  }

  return { status: "success", playerPokemonId };
}
