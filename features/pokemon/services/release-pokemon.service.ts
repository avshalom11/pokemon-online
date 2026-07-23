import "server-only";

import { prisma } from "@/lib/db/prisma";

export type ReleasePokemonResult =
  | { status: "released" }
  | { status: "not-owned" }
  | { status: "in-party" }
  | { status: "in-battle" }
  | { status: "last-pokemon" };

// Permanently deletes a PlayerPokemon row — the only place that ever
// happens. A hard delete (not a soft/flagged delete) is deliberate: nothing
// else in this project reads a released Pokémon for history or audit
// purposes (no capture log, no trade history), and no other table has a
// foreign key into PlayerPokemon except FieldBattleSession, which is always
// deleted the moment a battle ends — so by the time a release request
// reaches here, the only thing that could still legitimately reference this
// row is a *currently active* session, which the in-battle check below
// catches, and the FK's onDelete: Restrict (prisma/schema.prisma) backs
// that up at the database level regardless.
//
// Every check re-reads fresh from the database (never trusts a client's
// idea of party/battle/collection state) and re-validates ownership before
// any business rule, exactly like party-management.service.ts's existing
// mutations.
export async function releasePokemon(playerId: string, playerPokemonId: string): Promise<ReleasePokemonResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (pokemon.partySlot !== null) {
    return { status: "in-party" };
  }

  const [totalOwned, activeBattleSession] = await Promise.all([
    prisma.playerPokemon.count({ where: { playerId } }),
    prisma.fieldBattleSession.findFirst({ where: { playerId, activePlayerPokemonId: playerPokemonId } }),
  ]);

  if (activeBattleSession) {
    return { status: "in-battle" };
  }

  // The heal system (features/pokemon-center) can always bring a fainted
  // Pokémon back to usable, so "at least one owned" is the only durable
  // floor that matters — there's no scenario where 1+ owned Pokémon are all
  // *permanently* unusable, so no separate "last usable" rule is needed on
  // top of this.
  if (totalOwned <= 1) {
    return { status: "last-pokemon" };
  }

  await prisma.playerPokemon.delete({ where: { id: playerPokemonId } });

  return { status: "released" };
}
