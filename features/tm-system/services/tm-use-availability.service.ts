import "server-only";

import { parseNpcBattleParticipantIds } from "@/features/gyms/services/gym-battle-session.service";
import { parseLeagueBattlePokemon } from "@/features/leagues/services/league-battle-session.service";
import type { Prisma } from "@/lib/generated/prisma/client";

export type TmUseUnavailableReason = "in-daycare" | "in-field-battle" | "in-gym-battle" | "in-league-battle" | "already-listed";

export type TmUseAvailability = { status: "available" } | { status: "unavailable"; reason: TmUseUnavailableReason };

// TM SYSTEM PHASE 4 — "is it safe to permanently mutate this Pokémon's
// moveset right now" — every check here re-reads fresh from the database
// (never trusts a caller's idea of state) and each other feature's own
// table is checked DIRECTLY, never via that feature's own service, same
// "check the other feature's own table directly rather than depend on its
// service" precedent release-pokemon.service.ts and features/marketplace's
// own getPokemonMarketAvailability already establish (that function's own
// doc comment explains the gym/league gap this reuses the same fix for).
//
// Deliberately narrower than getPokemonMarketAvailability: teaching a TM
// must NOT be blocked merely because a Pokémon is the player's Starter or
// currently in the active Party — both are completely normal, expected TM
// targets. Ownership itself (not-owned) is the caller's own responsibility
// here (teach-tm.service.ts already re-reads the Pokémon row for its own
// speciesId lookup before calling this), so this function only ever
// receives an id already confirmed to exist and belong to playerId.
export async function getTmUseAvailability(
  client: Prisma.TransactionClient,
  playerId: string,
  playerPokemonId: string
): Promise<TmUseAvailability> {
  const [daycareStay, fieldBattleSession, npcBattleSession, existingListing] = await Promise.all([
    client.playerDaycareStay.findUnique({ where: { playerPokemonId } }),
    client.fieldBattleSession.findFirst({ where: { playerId, activePlayerPokemonId: playerPokemonId } }),
    client.npcBattleSession.findUnique({ where: { playerId }, select: { playerPokemonIds: true } }),
    client.marketplaceListingPokemon.findUnique({ where: { playerPokemonId } }),
  ]);

  if (daycareStay) {
    return { status: "unavailable", reason: "in-daycare" };
  }

  if (fieldBattleSession) {
    return { status: "unavailable", reason: "in-field-battle" };
  }

  if (npcBattleSession && parseNpcBattleParticipantIds(npcBattleSession.playerPokemonIds).includes(playerPokemonId)) {
    return { status: "unavailable", reason: "in-gym-battle" };
  }

  if (existingListing) {
    return { status: "unavailable", reason: "already-listed" };
  }

  if (await isInActiveLeagueBattle(client, playerId, playerPokemonId)) {
    return { status: "unavailable", reason: "in-league-battle" };
  }

  return { status: "available" };
}

// Same two-step resolution as features/marketplace/services/
// pokemon-availability.service.ts's own isInActiveLeagueBattle (duplicated
// rather than imported: that function is private to its own module, and
// this check is small/stable enough that importing across feature
// boundaries for it isn't worth the coupling — see this module's own doc
// comment on checking other features' tables directly rather than through
// their services).
async function isInActiveLeagueBattle(
  client: Prisma.TransactionClient,
  playerId: string,
  playerPokemonId: string
): Promise<boolean> {
  const participants = await client.leagueTournamentParticipant.findMany({
    where: { playerId },
    select: { id: true },
  });

  if (participants.length === 0) return false;

  const participantIds = participants.map((participant) => participant.id);

  const [sessionsAsSideA, sessionsAsSideB] = await Promise.all([
    client.leagueBattleSession.findMany({
      where: { status: { not: "completed" }, participantAId: { in: participantIds } },
      select: { participantAPokemon: true },
    }),
    client.leagueBattleSession.findMany({
      where: { status: { not: "completed" }, participantBId: { in: participantIds } },
      select: { participantBPokemon: true },
    }),
  ]);

  const ownSideSnapshots = [
    ...sessionsAsSideA.map((session) => session.participantAPokemon),
    ...sessionsAsSideB.map((session) => session.participantBPokemon),
  ];

  return ownSideSnapshots.some((snapshot) =>
    parseLeagueBattlePokemon(snapshot).some((entry) => entry.playerPokemonId === playerPokemonId)
  );
}
