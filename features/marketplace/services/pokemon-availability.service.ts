import "server-only";

import { parseNpcBattleParticipantIds } from "@/features/gyms/services/gym-battle-session.service";
import { parseLeagueBattlePokemon } from "@/features/leagues/services/league-battle-session.service";
import type { Prisma } from "@/lib/generated/prisma/client";

export type PokemonMarketUnavailableReason =
  | "not-owned"
  | "is-starter"
  | "in-daycare"
  | "in-field-battle"
  | "in-gym-battle"
  | "in-league-battle"
  | "already-listed";

export type PokemonMarketAvailability =
  | { status: "available" }
  | { status: "unavailable"; reason: PokemonMarketUnavailableReason };

// MARKETPLACE PHASE 1 — the ONE place "can this specific Pokémon be listed
// right now" is decided, mirroring release-pokemon.service.ts's own
// established convention: every check re-reads fresh from the database
// (never trusts a caller's idea of state), re-validates ownership first,
// and each of the other feature's own tables is checked DIRECTLY (not via
// that feature's service) — same "check the other feature's own table
// directly rather than depend on its service" precedent
// release-pokemon.service.ts and party-management.service.ts already
// establish.
//
// Deliberately NOT a blocker here: being in the active PARTY. This
// feature's own confirmed product rule is "a Pokémon currently in party MAY
// be listed; remove it from party when listing becomes active" — that
// removal is create-listing service work (a later phase), not an
// availability check, so partySlot is never inspected by this function.
//
// "In battle" is checked across every battle system that can currently hold
// a live Pokémon, not just the one with an existing onDelete: Restrict lock:
//   - Field battle (wild/tutorial): FieldBattleSession.activePlayerPokemonId
//     is a real FK with onDelete: Restrict — same check
//     release-pokemon.service.ts already runs.
//   - Gym/Regional-Champion battle: NpcBattleSession has NO FK to
//     PlayerPokemon (playerPokemonIds is a plain Json snapshot array) — see
//     this project's own Marketplace audit report for why this is a real,
//     pre-existing gap (release/daycare/party services don't check it
//     either). This function closes that gap for Marketplace specifically
//     by parsing the snapshot with the SAME parser gym-battle-session.service.ts
//     itself uses, rather than re-implementing JSON validation.
//   - League PvP battle: LeagueBattleSession never references
//     PlayerPokemon.id directly — a participant's roster lives in
//     participant{A,B}Pokemon, a frozen LeagueBattlePokemonSnapshot[] JSON
//     array resolved by their own LeagueTournamentParticipant.id. Same "no
//     existing lock to reuse" gap as gym battles, closed the same way.
//
// MARKETPLACE PHASE 2 — takes an explicit Prisma client (a `tx` from inside
// create-listing.service.ts's own transaction, or the bare `prisma` import
// for a standalone call) rather than importing the module-level `prisma`
// singleton directly, same "always takes an existing client, never opens
// its own transaction" convention currency-reward.service.ts's
// spendCurrency/grantCurrencyRewards already establish — this lets
// create-listing's own multi-asset transaction see a single consistent
// snapshot across every check it runs, and roll every check back together
// with the writes that follow if any one of them fails.
export async function getPokemonMarketAvailability(
  client: Prisma.TransactionClient,
  playerId: string,
  playerPokemonId: string
): Promise<PokemonMarketAvailability> {
  const pokemon = await client.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "unavailable", reason: "not-owned" };
  }

  if (pokemon.isStarter) {
    return { status: "unavailable", reason: "is-starter" };
  }

  const daycareStay = await client.playerDaycareStay.findUnique({ where: { playerPokemonId } });
  if (daycareStay) {
    return { status: "unavailable", reason: "in-daycare" };
  }

  const mutationLockReason = await getPokemonMutationLockReason(client, playerId, playerPokemonId);
  if (mutationLockReason) {
    return { status: "unavailable", reason: mutationLockReason };
  }

  return { status: "available" };
}

// EVOLUTION ITEM LOCK SAFETY FIX — the authoritative "is this Pokémon
// currently locked into a Marketplace listing or an active battle" check,
// extracted out of getPokemonMarketAvailability above (same exact checks,
// same relative order — already-listed, field battle, gym battle, league
// battle) so a SECOND, unrelated consumer (features/evolution's own
// evolution-item accept flow — a Pokémon must not permanently change
// species while marketplace-locked or battle-locked, the exact same
// "don't mutate a Pokémon out from under a system that's currently relying
// on its stable identity/roster membership" reasoning this function
// already encodes for Marketplace itself) can reuse the SAME authoritative
// tables/queries rather than a second, parallel implementation. Deliberately
// excludes is-starter (a Marketplace-only listing rule, irrelevant to
// evolution — a starter Pokémon must still be able to use an evolution
// item normally) and in-daycare (already enforced for evolution a different
// way — see features/pokemon/services/player-pokemon.ts's own
// getAllOwnedPokemon, which excludes deposited Pokémon from the owned-
// Pokémon list every evolution-item consumer reads from; left unchanged by
// this fix, per its own explicit scope).
export type PokemonMutationLockReason = "already-listed" | "in-field-battle" | "in-gym-battle" | "in-league-battle";

export async function getPokemonMutationLockReason(
  client: Prisma.TransactionClient,
  playerId: string,
  playerPokemonId: string
): Promise<PokemonMutationLockReason | null> {
  const [fieldBattleSession, npcBattleSession, existingListing] = await Promise.all([
    client.fieldBattleSession.findFirst({ where: { playerId, activePlayerPokemonId: playerPokemonId } }),
    client.npcBattleSession.findUnique({ where: { playerId }, select: { playerPokemonIds: true } }),
    client.marketplaceListingPokemon.findUnique({ where: { playerPokemonId } }),
  ]);

  if (fieldBattleSession) {
    return "in-field-battle";
  }

  if (npcBattleSession && parseNpcBattleParticipantIds(npcBattleSession.playerPokemonIds).includes(playerPokemonId)) {
    return "in-gym-battle";
  }

  if (existingListing) {
    return "already-listed";
  }

  if (await isInActiveLeagueBattle(client, playerId, playerPokemonId)) {
    return "in-league-battle";
  }

  return null;
}

// Bulk variant of getPokemonMutationLockReason above — used by any UI that
// needs to filter a whole owned-Pokémon list down to "not currently
// locked" up front (e.g. the Inventory's evolution-item candidate list),
// rather than a per-row round trip. Reuses the exact same per-Pokémon
// check, just fanned out with Promise.all; never a second/duplicated query
// shape. Takes the bare `prisma` singleton at the caller (a plain read, not
// part of any write transaction), same "bare prisma import for a
// standalone call" precedent this file's own module doc comment already
// establishes for getPokemonMarketAvailability.
export async function getLockedPlayerPokemonIds(
  client: Prisma.TransactionClient,
  playerId: string,
  playerPokemonIds: readonly string[]
): Promise<Set<string>> {
  const results = await Promise.all(
    playerPokemonIds.map(async (playerPokemonId) => ({
      playerPokemonId,
      lockReason: await getPokemonMutationLockReason(client, playerId, playerPokemonId),
    }))
  );

  return new Set(results.filter((result) => result.lockReason !== null).map((result) => result.playerPokemonId));
}

// A player's own League PvP roster isn't reachable by playerId directly —
// LeagueBattleSession.participant{A,B}Id reference LeagueTournamentParticipant.id,
// which is what actually carries playerId. Resolved in two steps (this
// player's own participant ids, then any non-completed session where either
// side is one of them) rather than a single query, since Prisma cannot join
// through a plain-string (non-FK) column the way participant{A,B}Id are
// declared here (same "plain strings, not enforced FKs" precedent this
// model's own schema doc comment documents). The two sides are queried
// separately (never a single `OR: [...]` filter) purely to keep this
// reachable from both directions with plain `in`-filtered findMany calls.
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
