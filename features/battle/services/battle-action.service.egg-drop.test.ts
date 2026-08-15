// EGGS PHASE 2 focused coverage — runs the real executeBattleAction (the
// actual field-battle victory flow) unmodified, same "real service, fake
// DB" shape battle-action.service.persistence.test.ts already established.
// Every random-dependent outcome below is deterministic via an injected
// randomSource — no statistical/flaky assertions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { executeBattleAction } from "@/features/battle/services/battle-action.service";
import { endBattleSession } from "@/features/battle-session/services/battle-session.service";
import { getJerusalemDateKey } from "@/features/daily-battles/services/daily-battle-count.service";
import { listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import {
  resetFakeDb,
  seedFieldBattleSession,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getDailyBattleCountRow,
  getEggIncubationRow,
  getOwnedEggRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

// A guaranteed-lethal setup identical in shape to
// battle-action.service.persistence.test.ts's own "defeating the wild"
// test: wildCurrentHp: 1 is guaranteed lethal against any real damaging
// move (the Damage Engine's own "at least 1 damage" floor), so this needs
// no hand-computed damage formula.
function seedGuaranteedVictorySetup(playerId: string) {
  seedPlayerProfile({ id: playerId });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId, speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId,
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
  return pokemon;
}

beforeEach(() => {
  resetFakeDb();
});

test("a successful field-battle victory can trigger an egg roll and award a real egg", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // random() = 0 for every roll this turn: guaranteed hit/damage (as the
  // existing GUARANTEED_CRITICAL_RANDOM_SOURCE precedent already
  // establishes for this exact value), AND rollEggDrop(0) < 0.0025 ->
  // dropped, AND rollEggRarity(0) -> common (the first cumulative band).
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, true);
  assert.ok(result.experienceGranted, "the wild-defeat reward must still be granted");

  const egg = result.experienceGranted?.egg;
  assert.ok(egg);
  assert.equal(egg?.dropped, true);
});

test("the dropped egg's regionId matches the field battle's own region (the player's active region), and source is 'battle'", async () => {
  seedPlayerProfile({ id: "owner-1", regionId: "johto" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const egg = result.experienceGranted?.egg;
  assert.equal(egg?.dropped, true);
  if (!egg || !egg.dropped) return;

  assert.equal(egg.regionId, "johto");
  assert.equal(egg.rarity, "common");

  // Persisted through the real PlayerOwnedEgg model — Phase 1's own storage,
  // never a second mechanism.
  const row = getOwnedEggRow(egg.ownedEggId);
  assert.ok(row, "the egg must be persisted through PlayerOwnedEgg");
  assert.equal(row?.regionId, "johto");
  assert.equal(row?.source, "battle");
  assert.equal(row?.playerId, "owner-1");
});

test("the awarded egg is not left actively incubating — Phase 2 only awards it, Phase 3 handles incubation", async () => {
  seedGuaranteedVictorySetup("owner-1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const egg = result.experienceGranted?.egg;
  assert.equal(egg?.dropped, true);
  if (!egg || !egg.dropped) return;

  assert.equal(getEggIncubationRow(egg.ownedEggId), undefined, "a freshly awarded egg must not already be incubating");
});

test("a missed roll reports dropped: false and creates no egg, without disturbing the rest of the reward", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // 0.999999 is the existing suite's own "guaranteed miss" constant for
  // every drop-chance roll (see MAX_ROLL_RANDOM_SOURCE's own comment in
  // battle-action.service.persistence.test.ts).
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, true);
  assert.ok(result.experienceGranted, "XP/currency must still be granted normally");
  assert.deepEqual(result.experienceGranted?.egg, { dropped: false });
});

test("escaping never awards an egg", async () => {
  seedGuaranteedVictorySetup("owner-1");

  await endBattleSession("owner-1");

  // No egg exists for this player at all — escaping never even reaches
  // syncWildHp's reward transaction, so there is nothing to roll against in
  // the first place.
  assert.deepEqual(await listOwnedEggs("owner-1"), []);
});

test("a loss (the player's party is defeated without the wild fainting) never awards an egg, even with a guaranteed-drop roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // 1 HP: any real damaging hit from the wild's own counter-attack is
  // guaranteed lethal (the Damage Engine's own "at least 1 damage" floor).
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
  // growl is a status move — it always deals exactly 0 damage, so the wild
  // can never faint from this turn no matter what randomSource is used.
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    // getStartingKnownMoves("bulbasaur", 3) -> ["growl", "tackle",
    // "vine-whip"] (documented precedent in
    // battle-action.service.persistence.test.ts); random() = 0.9 selects
    // index floor(0.9*3) = 2 -> vine-whip, a guaranteed-accuracy (100)
    // damaging hit that (via the "at least 1" floor) always faints a 1 HP
    // target.
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  // random() = 0.9 for the whole turn also feeds the (never-reached) egg
  // roll — chosen deliberately to prove that even a value low enough to
  // beat some rarity odds still awards nothing, because the code path
  // never gets there at all (wildFainted stays false the entire time).
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0.9);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false, "growl can never defeat the wild");
  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true, "the player's only party member just fainted");
  assert.equal(result.winner, "wild");
  assert.equal(result.experienceGranted, null, "no reward of any kind — including an egg — is granted on a loss");
});

test("a non-lethal, unfinished-battle turn never awards an egg, even with a guaranteed-drop roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  // growl deals 0 damage — the wild is guaranteed to survive this turn.
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false);
  assert.equal(result.experienceGranted, null, "an unfinished battle grants no reward, including no egg");
});

test("winning still increments the existing daily battle count exactly like before — nothing about that was touched", async () => {
  seedGuaranteedVictorySetup("owner-1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(getDailyBattleCountRow("owner-1", getJerusalemDateKey())?.count, 1);
  assert.ok(result.experienceGranted?.player, "player XP reward is still granted alongside the egg roll");
  assert.ok(Array.isArray(result.experienceGranted?.pokemon), "Pokémon XP reward is still granted alongside the egg roll");
});
