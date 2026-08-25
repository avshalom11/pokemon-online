import "server-only";

import { prisma } from "@/lib/db/prisma";

export type ReleasePokemonResult =
  | { status: "released" }
  | { status: "not-owned" }
  | { status: "in-party" }
  | { status: "in-battle" }
  // DAYCARE — HIDE DEPOSITED + PROTECT FROM REMOVAL. A Pokémon currently
  // deposited in the Daycare (features/daycare) can never be released —
  // see this function's own doc comment below.
  | { status: "in-daycare" }
  | { status: "last-pokemon" };

// Permanently deletes a PlayerPokemon row — the only place that ever
// happens. A hard delete (not a soft/flagged delete) is deliberate: nothing
// else in this project reads a released Pokémon for history or audit
// purposes (no capture log, no trade history). Two other tables hold a
// foreign key into PlayerPokemon: FieldBattleSession (always deleted the
// moment a battle ends — the in-battle check below catches a session still
// active right now) and PlayerDaycareStay (deleted only by a real
// collection — the in-daycare check below catches a deposit still active
// right now). Both FKs are onDelete: Restrict (prisma/schema.prisma),
// which backs both checks up at the database level regardless — this
// function's own checks exist to turn that into a clean, typed result
// instead of a raw constraint-violation error reaching the caller.
//
// Every check re-reads fresh from the database (never trusts a client's
// idea of party/battle/Daycare/collection state) and re-validates
// ownership before any business rule, exactly like
// party-management.service.ts's existing mutations.
export async function releasePokemon(playerId: string, playerPokemonId: string): Promise<ReleasePokemonResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  if (pokemon.partySlot !== null) {
    return { status: "in-party" };
  }

  const [totalOwned, activeBattleSession, daycareStay] = await Promise.all([
    prisma.playerPokemon.count({ where: { playerId } }),
    prisma.fieldBattleSession.findFirst({ where: { playerId, activePlayerPokemonId: playerPokemonId } }),
    // Same direct row-existence check (not a features/daycare import) as
    // party-management.service.ts's own assignToPartySlot — "check the
    // other feature's own table directly rather than depend on its
    // service".
    prisma.playerDaycareStay.findUnique({ where: { playerPokemonId } }),
  ]);

  if (activeBattleSession) {
    return { status: "in-battle" };
  }

  if (daycareStay) {
    return { status: "in-daycare" };
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
