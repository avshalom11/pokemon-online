import "server-only";

import { hasUsableMember } from "@/features/party/utils/party-rules";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { prisma } from "@/lib/db/prisma";

export type PartyMutationResult =
  | { status: "ok" }
  | { status: "not-owned" }
  | { status: "not-in-party" }
  | { status: "would-leave-no-usable" }
  // POKÉMON DAYCARE — PHASE 1. A Pokémon currently deposited in the
  // Daycare (features/daycare) can never re-enter the active party — see
  // assignToPartySlot's own doc comment for why this check lives here
  // rather than only at deposit time.
  | { status: "in-daycare" };

// Every mutation here re-validates ownership server-side against `playerId`
// (the caller's own profile id, resolved from the session — never a
// client-sent value) rather than trusting a client-supplied playerPokemonId
// belongs to the right player. This is the only place PlayerPokemon.partySlot
// is ever written outside of onboarding's starter placement.

// Assigns (or moves) a Pokémon into a slot, replacing whoever currently
// occupies that slot — "add/replace" from the party-editing UI. Moving a
// Pokémon that already has a slot vacates its old slot implicitly, since a
// single row only ever holds one partySlot value.
//
// POKÉMON DAYCARE — PHASE 1 — the one place this rule needs enforcing
// beyond deposit time itself: depositToDaycare (features/daycare/services/
// daycare.service.ts) already refuses to deposit a Pokémon that's
// currently in the party, but without a check HERE too, a player could
// still separately re-assign an already-deposited Pokémon back into an
// active party slot afterward — this is the one other entry point that
// can put a Pokémon INTO the party (swapPartySlots only ever rearranges
// existing occupants), so this is the one other place that must refuse a
// Daycare'd Pokémon to keep "cannot be used in party/battle while
// deposited" true everywhere, not just at the moment of deposit. A direct
// row-existence check (not a features/daycare import) — same "check the
// other feature's own table directly rather than depend on its service"
// precedent release-pokemon.service.ts already establishes for its own
// battle-session check.
export async function assignToPartySlot(
  playerId: string,
  playerPokemonId: string,
  slotIndex: number
): Promise<PartyMutationResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  const daycareStay = await prisma.playerDaycareStay.findUnique({ where: { playerPokemonId } });
  if (daycareStay) {
    return { status: "in-daycare" };
  }

  await prisma.$transaction([
    prisma.playerPokemon.updateMany({
      where: { playerId, partySlot: slotIndex },
      data: { partySlot: null },
    }),
    prisma.playerPokemon.update({
      where: { id: playerPokemonId },
      data: { partySlot: slotIndex },
    }),
  ]);

  return { status: "ok" };
}

// Swaps whichever Pokémon occupy slotA/slotB (handles both-occupied,
// one-empty, and both-empty). One slot is vacated to a temporary `null`
// first so the transaction never trips the [playerId, partySlot] unique
// index against itself mid-swap.
export async function swapPartySlots(playerId: string, slotIndexA: number, slotIndexB: number): Promise<PartyMutationResult> {
  if (slotIndexA === slotIndexB) {
    return { status: "ok" };
  }

  const [occupantA, occupantB] = await Promise.all([
    prisma.playerPokemon.findFirst({ where: { playerId, partySlot: slotIndexA } }),
    prisma.playerPokemon.findFirst({ where: { playerId, partySlot: slotIndexB } }),
  ]);

  await prisma.$transaction(async (tx) => {
    if (occupantA) {
      await tx.playerPokemon.update({ where: { id: occupantA.id }, data: { partySlot: null } });
    }
    if (occupantB) {
      await tx.playerPokemon.update({ where: { id: occupantB.id }, data: { partySlot: slotIndexA } });
    }
    if (occupantA) {
      await tx.playerPokemon.update({ where: { id: occupantA.id }, data: { partySlot: slotIndexB } });
    }
  });

  return { status: "ok" };
}

// Removes a Pokémon from the party (frees its slot), refusing if that would
// leave the party with zero usable (HP > 0) members — the player must always
// have someone to start their next battle with.
export async function removeFromParty(playerId: string, playerPokemonId: string): Promise<PartyMutationResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }
  if (pokemon.partySlot === null) {
    return { status: "not-in-party" };
  }

  const party = await getPlayerParty(playerId);
  const remaining = party.filter((member) => member.id !== playerPokemonId);

  if (!hasUsableMember(remaining)) {
    return { status: "would-leave-no-usable" };
  }

  await prisma.playerPokemon.update({ where: { id: playerPokemonId }, data: { partySlot: null } });

  return { status: "ok" };
}
