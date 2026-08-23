// FIELD CAPTURE — AUTO-ADD TO PARTY IF SPACE. Runs the real attemptCapture
// (capture.service.ts) against the fake Prisma DB, same "real service, fake
// DB" shape battle-action.service.egg-drop.test.ts already established.
// Uses the Master Ball for every capture here — it bypasses the capture
// RNG entirely (guaranteed capture, see capture.service.ts's own
// MASTER_BALL_ITEM_ID branch), so these tests can assert on the party-slot
// outcome deterministically without touching Math.random or the capture
// chance formula at all.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { attemptCapture } from "@/features/battle/services/capture.service";
import { getFirstEmptyPartySlot } from "@/features/party/utils/party-rules";
import {
  getInventoryItemRow,
  getPlayerPokemonsByPlayerId,
  resetFakeDb,
  seedFieldBattleSession,
  seedInventoryItem,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";
const MASTER_BALL = "master-ball";

function seedBattlerAndSession(playerId: string, wildSpeciesId = "bulbasaur") {
  seedPlayerPokemon({ id: "active", playerId, speciesId: "charmander", level: 20, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "active", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId,
    zoneId: ZONE_ID,
    wildSpeciesId,
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "active",
  });
  seedInventoryItem({ playerId, itemId: MASTER_BALL, quantity: 1 });
}

beforeEach(() => {
  resetFakeDb();
});

// (1) an empty party slot exists -> the newly captured Pokémon is
// auto-added to the first available slot.
test("(1) a captured Pokémon is auto-added to the party when a slot is free", async () => {
  seedPlayerProfile({ id: "p1" });
  // Party: [1: active, 2-6: empty] — slot 1 already occupied by the
  // active battler seeded in seedBattlerAndSession.
  seedBattlerAndSession("p1");

  const result = await attemptCapture("p1", MASTER_BALL);

  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.addedToParty, true);

  const party = getPlayerPokemonsByPlayerId("p1").filter((p) => p.partySlot !== null);
  const captured = party.find((p) => p.speciesId === "bulbasaur");
  assert.ok(captured, "the captured Pokémon must be in the party");
  assert.equal(captured!.partySlot, 2, "must land in the first free slot (2 — slot 1 is already the active battler)");
});

// (2) uses the FIRST available (lowest-numbered) empty slot, not just any
// empty slot.
test("(2) the first (lowest-numbered) empty slot is used, even when a later slot is free too", async () => {
  seedPlayerProfile({ id: "p2" });
  seedBattlerAndSession("p2"); // occupies slot 1
  // Occupy slots 2 and 4, leaving 3, 5, 6 free — 3 is the lowest.
  seedPlayerPokemon({ id: "m2", playerId: "p2", speciesId: "squirtle", partySlot: 2 });
  seedPlayerPokemon({ id: "m4", playerId: "p2", speciesId: "squirtle", partySlot: 4 });

  const result = await attemptCapture("p2", MASTER_BALL);
  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.addedToParty, true);

  const captured = getPlayerPokemonsByPlayerId("p2").find((p) => p.speciesId === "bulbasaur");
  assert.equal(captured!.partySlot, 3);
});

// (3) party already full (6/6) -> stays in storage only, never bumps an
// existing member.
test("(3) a full party (6/6) leaves the captured Pokémon in storage — never replaces an existing member", async () => {
  seedPlayerProfile({ id: "p3" });
  seedBattlerAndSession("p3"); // slot 1
  for (let slot = 2; slot <= 6; slot++) {
    seedPlayerPokemon({ id: `m${slot}`, playerId: "p3", speciesId: "squirtle", partySlot: slot });
  }

  const before = getPlayerPokemonsByPlayerId("p3")
    .filter((p) => p.partySlot !== null)
    .map((p) => ({ id: p.id, slot: p.partySlot }))
    .sort((a, b) => a.slot! - b.slot!);

  const result = await attemptCapture("p3", MASTER_BALL);
  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.addedToParty, false);

  const captured = getPlayerPokemonsByPlayerId("p3").find((p) => p.speciesId === "bulbasaur");
  assert.ok(captured);
  assert.equal(captured!.partySlot, null, "a full party must leave the new Pokémon in storage (partySlot null)");

  const after = getPlayerPokemonsByPlayerId("p3")
    .filter((p) => p.partySlot !== null)
    .map((p) => ({ id: p.id, slot: p.partySlot }))
    .sort((a, b) => a.slot! - b.slot!);
  assert.deepEqual(after, before, "no existing party member's slot may change");
});

// (4) ownership is still created exactly once — the auto-party-add step
// never creates a second row or duplicates the Pokémon.
test("(4) exactly one PlayerPokemon row is created per capture, regardless of party outcome", async () => {
  seedPlayerProfile({ id: "p4" });
  seedBattlerAndSession("p4");

  await attemptCapture("p4", MASTER_BALL);

  const capturedRows = getPlayerPokemonsByPlayerId("p4").filter((p) => p.speciesId === "bulbasaur");
  assert.equal(capturedRows.length, 1);
});

// (5) capture RNG/ball consumption/level/stats are all untouched by this
// change — spot-checked alongside the party outcome.
test("(5) capture mechanics (ball consumption, level, HP) are unaffected by the auto-party-add change", async () => {
  seedPlayerProfile({ id: "p5" });
  seedBattlerAndSession("p5");

  const result = await attemptCapture("p5", MASTER_BALL);

  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.remainingQuantity, 0, "the one owned Master Ball must still be consumed exactly as before");
  assert.equal(getInventoryItemRow("p5", MASTER_BALL)?.quantity ?? 0, 0);

  const captured = getPlayerPokemonsByPlayerId("p5").find((p) => p.speciesId === "bulbasaur");
  assert.equal(captured!.level, 5, "captured level must still match the wild Pokémon's own level");
  assert.equal(captured!.currentHp, 10, "captured HP must still match the wild Pokémon's own current HP");
});

// (6) getFirstEmptyPartySlot — the pure helper itself.
test("(6) getFirstEmptyPartySlot returns the lowest free slot, or null when full", () => {
  assert.equal(getFirstEmptyPartySlot([]), 1);
  assert.equal(getFirstEmptyPartySlot([1]), 2);
  assert.equal(getFirstEmptyPartySlot([1, 2, 4]), 3);
  assert.equal(getFirstEmptyPartySlot([1, 2, 3, 4, 5, 6]), null);
  assert.equal(getFirstEmptyPartySlot([2, 4, 6]), 1);
});
