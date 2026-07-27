// Phase 4F/5A regression tests for the Battle Action Service — the single
// server-side entry point that resolves a player's attack, now with a
// selected Known Move's moveId flowing through it (see
// battle-action.service.ts's own doc comment). Runs the REAL
// executeBattleAction unmodified; only "@/lib/db/prisma" is redirected to
// an in-memory fake (test/support/fakes/prisma.fake.ts — see
// test/support/alias-loader.mjs), since this project has no disposable
// database to run automated tests against and must never run destructive
// tests against the shared live Neon DB.
//
// Run via `npm test` (wires up the alias loader).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { TEMPORARY_ATTACK_DAMAGE } from "@/engine/battle/battle-config";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { executeBattleAction, type BattleActionType } from "@/features/battle/services/battle-action.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPlayerProfile,
  seedFieldBattleSession,
  getFieldBattleSessionRow,
  getPlayerPokemonRow,
  getPlayerPokemonUpdateCallCount,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

// Level 100 (MAX_POKEMON_LEVEL) so any Pokémon-XP grant in the "wild
// defeated" tests is a guaranteed no-op level-wise (already capped) — this
// keeps those tests from having to also fake a Known Move/learnset level-up
// cascade, which is unrelated, untouched territory for this phase. Known
// two moves by default (growl, scratch) so Phase 5A's "selecting a known
// move succeeds"/"a move known by a different Pokémon is rejected" tests
// have something real to pick from without every test needing its own
// bespoke setup.
function seedMaxLevelActivePokemon(id: string, playerId: string, currentHp: number) {
  const pokemon = seedPlayerPokemon({
    id,
    playerId,
    speciesId: "charmander",
    level: 100,
    experience: 999_999,
    currentHp,
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: id, moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 2 });
  return pokemon;
}

// syncWildHp (battle-session.service.ts, reused unchanged by the Battle
// Action Service) re-derives the wild's max HP from its own species+level
// rather than trusting a stored value, and clamps the persisted HP to it —
// exactly like it always has. Seeding a wildMaxHp inconsistent with that
// real formula would make the *persisted* HP diverge from the value these
// tests assert on, so every wild HP here is derived from the same formula
// the production code uses instead of a guessed constant.
function bulbasaurMaxHpAtLevel(level: number): number {
  const species = getSpeciesById("bulbasaur");
  if (!species) throw new Error("test setup: bulbasaur species not found in the catalog");
  return calculatePokemonHpStat(species.baseStats.health, level);
}

beforeEach(() => {
  resetFakeDb();
});

// Phase 5B.2 fixtures: charmander (attacker, level 100) vs. bulbasaur
// (defender, level 100 — same level as the attacker, so its real max HP
// (200, via bulbasaurMaxHpAtLevel) comfortably survives every hit below;
// syncWildHp always re-derives and clamps to the *real* species/level max,
// so the seeded wildMaxHp must match that real value, not an arbitrary
// number). Hand-computed via the exact Phase 5B.1 formula:
//   charmander Attack@100        = floor(2*52*100/100)+5 = 109
//   charmander SpecialAttack@100 = floor(2*60*100/100)+5 = 125
//   bulbasaur Defense@100        = floor(2*49*100/100)+5 = 103
//   bulbasaur SpecialDefense@100 = floor(2*65*100/100)+5 = 135
//   levelFactor                  = 2*100/5+2             = 42
//   scratch (physical, power 40): raw = 42*40*109/103 = 1778.834...
//     baseDamage = floor(1778.834/50+2) = floor(37.5766...) = 37
//   ember (special, power 40):    raw = 42*40*125/135 = 1555.555...
//     baseDamage = floor(1555.555/50+2) = floor(33.111...) = 33
//     charmander is Fire-type and ember is a Fire-type move (Phase 5C
//     STAB): afterRandom (rf=1.0) = 33 -> floor(33*1.5) = floor(49.5) = 49.
//     bulbasaur is Grass/Poison (Phase 5D Type Effectiveness): Fire vs.
//     Grass = 2x (super-effective), Fire vs. Poison = 1x (neutral) ->
//     combined 2x -> floor(49*2) = 98.
//     scratch is Normal-type and charmander is not Normal-type, so it
//     never receives STAB; Normal vs. Grass/Poison is neutral (1x) too —
//     37 stays 37, completely unaffected by either Phase 5C or 5D.
const BULBASAUR_LEVEL_100_MAX_HP_VALUE = bulbasaurMaxHpAtLevel(100);
const SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE = 37;
const EMBER_VS_LEVEL_100_BULBASAUR_DAMAGE = 98;

// A randomSource whose Math.random-shaped output rolls the maximum 1.00
// randomFactor (see engine/damage/random.ts's rollDamageRandomFactor: a
// value just under 1 rolls the top of the 85-100 integer-percent range).
// executeBattleAction draws all three Phase 5E/5F rolls (accuracy, damage
// random factor, critical) from this SAME source, so 0.999999 also rolls
// the highest possible accuracy roll (99, still a guaranteed hit against
// any accuracy > 99) and a guaranteed non-critical (0.999999 is nowhere
// near the 1/24 critical threshold) — exactly what every test using this
// constant already expects.
const MAX_ROLL_RANDOM_SOURCE = () => 0.999999;

// A randomSource that rolls the minimum 0.85 randomFactor (floor(0.05*16)
// = 0) while staying just above CRITICAL_HIT_CHANCE (1/24 ≈ 0.041667), so
// it never incidentally triggers a critical hit the way a flat `() => 0`
// source would (0 < 1/24 is always true, which would silently inflate
// every "minimum roll" test below by an unwanted 1.5x). Also rolls a low
// accuracy check (5), a guaranteed hit against any move used with it here.
const MIN_ROLL_NO_CRIT_RANDOM_SOURCE = () => 0.05;

function seedLevel100BulbasaurSession(activePlayerPokemonId: string) {
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: BULBASAUR_LEVEL_100_MAX_HP_VALUE,
    wildMaxHp: BULBASAUR_LEVEL_100_MAX_HP_VALUE,
    activePlayerPokemonId,
  });
}

test("executes an attack: applies the Damage Engine's calculated damage to the wild, and the wild's unchanged fixed counter-attack to the party, in the same call", async () => {
  seedPlayerProfile({ id: "owner-1", level: 5, experience: 4000 });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.moveId, "scratch");
  assert.equal(result.playerDamage, SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedWildHp, BULBASAUR_LEVEL_100_MAX_HP_VALUE - SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.wildFainted, false);
  assert.equal(result.partyPokemonFainted, false);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, null);
  assert.equal(result.experienceGranted, null);

  assert.equal(
    getFieldBattleSessionRow("owner-1")?.wildCurrentHp,
    BULBASAUR_LEVEL_100_MAX_HP_VALUE - SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE
  );
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  // Exactly one write to the acting Pokémon's HP — the action was resolved
  // exactly once, not applied twice.
  assert.equal(getPlayerPokemonUpdateCallCount(), 1);
});

test("a status move (growl) deals zero damage to the wild via the Damage Engine's non-damaging result, but the wild still counter-attacks", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", MAX_ROLL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.playerDamage, 0);
  assert.equal(result.updatedWildHp, 100);
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.wildFainted, false);
});

test("a lower random roll (0.85) deals less damage than the maximum roll (1.00) for the same move and stats", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const minRollResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MIN_ROLL_NO_CRIT_RANDOM_SOURCE);
  assert.equal(minRollResult.status, "success");
  if (minRollResult.status !== "success") return;
  // baseDamage 37 * 0.85 = 31.45 -> floor 31 (no critical hit at this roll).
  assert.equal(minRollResult.playerDamage, 31);
  assert.ok(minRollResult.playerDamage < SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);
});

test("a higher-Attack (higher-level) attacker deals more calculated damage than a lower-level one against the same defender", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const lowLevelPokemon = seedPlayerPokemon({
    id: "p1",
    playerId: "owner-1",
    speciesId: "charmander",
    level: 10,
    currentHp: 100,
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: lowLevelPokemon.id, moveId: "scratch", slot: 1 });
  seedLevel100BulbasaurSession("p1");

  const lowLevelResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);
  assert.equal(lowLevelResult.status, "success");
  if (lowLevelResult.status !== "success") return;

  // charmander Attack@10 = floor(2*52*10/100)+5 = 15; levelFactor@10 = 2*10/5+2 = 6
  // raw = 6*40*15/103 = 34.951...; baseDamage = floor(34.951/50+2) = floor(2.699) = 2
  assert.equal(lowLevelResult.playerDamage, 2);
  assert.ok(
    lowLevelResult.playerDamage < SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE,
    "a level 10 attacker must deal less calculated damage than the level 100 attacker used in the baseline test above"
  );
});

test("a special move (ember) uses Special Attack/Special Defense, dealing a different, higher-Defense-reducing amount than a physical move with the same power", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "ember", slot: 2 });
  seedLevel100BulbasaurSession("p1");

  const physicalResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);
  assert.equal(physicalResult.status, "success");
  if (physicalResult.status !== "success") return;
  assert.equal(physicalResult.playerDamage, SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);

  // Reset the wild back to full before the second hit so both attacks are
  // measured against the same starting HP.
  seedLevel100BulbasaurSession("p1");

  const specialResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "ember", MAX_ROLL_RANDOM_SOURCE);
  assert.equal(specialResult.status, "success");
  if (specialResult.status !== "success") return;

  // charmander's Special Attack (60 base) is higher than its Attack (52
  // base), and bulbasaur's Special Defense (65 base) is higher than its
  // Defense (49 base) — different enough stats on both sides alone that
  // ember (power 40, special) would not land the same number as scratch
  // (power 40, physical). Phase 5C STAB and Phase 5D Type Effectiveness
  // both widen that gap further: ember is Fire-type and charmander is
  // Fire-type, so ember gets the 1.5x STAB bonus that Normal-type scratch
  // never does; bulbasaur is Grass/Poison, so ember (Fire) is also
  // super-effective (2x) against it while scratch (Normal) stays neutral.
  assert.equal(specialResult.playerDamage, EMBER_VS_LEVEL_100_BULBASAUR_DAMAGE);
  assert.notEqual(specialResult.playerDamage, physicalResult.playerDamage);
});

test("rejects when there is no battle session for the requested zone", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  // No session seeded at all.

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});

test("rejects when the session belongs to a different zone", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: "cave",
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});

test("rejects when the battle is already inactive (the wild has already fainted)", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 0,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
    wildDefeatRewardGranted: true,
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "battle-inactive" });
  assert.equal(getPlayerPokemonUpdateCallCount(), 0);
});

test("rejects when the session's active Pokémon does not belong to this player", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // Deliberately NOT seeding "p1" under owner-1's party at all — simulates a
  // session pointing at a Pokémon this player doesn't (or no longer) own.
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "someone-elses-pokemon",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "not-owned" });
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildCurrentHp, 100, "the wild must be untouched when ownership fails");
});

test("rejects when the active Pokémon has already fainted", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 0);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "invalid-active-pokemon" });
});

test("rejects an unrecognized action type", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "not-a-real-action" as unknown as BattleActionType, "growl");

  assert.deepEqual(result, { status: "invalid-action" });
});

test("defeating the wild grants the reward, ends the encounter without a counter-attack, and reports the player as the winner", async () => {
  seedPlayerProfile({ id: "owner-1", level: 5, experience: 4000 });
  seedMaxLevelActivePokemon("p1", "owner-1", 50);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    // 1 HP is guaranteed lethal against any real physical/special move: the
    // Damage Engine always deals at least 1 damage for a valid damaging
    // move (Phase 5B.1). scratch (physical, power 40), not growl (status,
    // which now deals zero and could never defeat anything).
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedWildHp, 0);
  assert.equal(result.wildFainted, true);
  assert.equal(result.enemyDamage, 0);
  assert.equal(result.updatedPartyHp, 50, "no counter-attack lands once the wild has fainted");
  assert.equal(result.partyPokemonFainted, false);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, "player");
  assert.ok(result.experienceGranted, "a reward must be granted the first time the wild is defeated");
  assert.ok(result.experienceGranted?.player);
  assert.ok(Array.isArray(result.experienceGranted?.pokemon));

  assert.equal(getFieldBattleSessionRow("owner-1")?.wildDefeatRewardGranted, true);

  // Re-submitting against the now-already-defeated wild must never grant a
  // second reward — the battle is inactive from here until the encounter
  // advances.
  const retry = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.deepEqual(retry, { status: "battle-inactive" });
});

test("the wild's counter-attack ending the player's only usable Pokémon ends the battle and deletes the session", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", TEMPORARY_ATTACK_DAMAGE);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedPartyHp, 0);
  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true);
  assert.equal(result.winner, "wild");
  assert.equal(getFieldBattleSessionRow("owner-1"), undefined, "the session must be deleted once the whole party is defeated");
});

test("a fainted Pokémon does not end the battle while another party member is still usable", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", TEMPORARY_ATTACK_DAMAGE);
  seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "squirtle", currentHp: 30, partySlot: 2 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, null);
  assert.notEqual(getFieldBattleSessionRow("owner-1"), undefined, "the session must survive a single faint while the party still has a usable member");
});

// ===========================================================================
// Phase 5A — moveId validation and pipeline plumbing
// ===========================================================================

test("selecting each of the active Pokémon's known moves succeeds", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // knows growl (slot 1) and scratch (slot 2)
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const growlResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.equal(growlResult.status, "success");

  const scratchResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");
  assert.equal(scratchResult.status, "success");
});

test("rejects a moveId that does not exist in the Move Registry", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "not-a-real-move");

  assert.deepEqual(result, { status: "invalid-move", moveId: "not-a-real-move" });
  assert.equal(getPlayerPokemonUpdateCallCount(), 0, "an invalid move must never apply any damage");
});

test("rejects a real registry move the active Pokémon does not actually know", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // knows only growl and scratch
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  // "ember" is a real Move Registry entry, but this Pokémon never learned it.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "ember");

  assert.deepEqual(result, { status: "invalid-move", moveId: "ember" });
});

test("rejects a move that is known, but only by a different Pokémon", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // active — knows growl, scratch
  const p2 = seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "squirtle", currentHp: 30, partySlot: 2 });
  seedKnownMove({ playerPokemonId: p2.id, moveId: "water-gun", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  // "water-gun" is real and known, but only by p2, which isn't the active
  // Pokémon in this session.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "water-gun");

  assert.deepEqual(result, { status: "invalid-move", moveId: "water-gun" });
});

test("the pipeline carries the selected moveId through to the result unchanged", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.moveId, "scratch");
});

// Phase 5B.2 superseded the old "every move deals the same fixed damage"
// assumption: the move itself (its power and category) now genuinely
// changes gameplay via the Damage Engine. growl (status) and scratch
// (physical, power 40) must no longer produce the same number.
test("different known moves produce different damage — a status move deals none, a physical move deals its calculated amount", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const growlResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", MAX_ROLL_RANDOM_SOURCE);
  assert.equal(growlResult.status, "success");
  if (growlResult.status !== "success") return;
  assert.equal(growlResult.playerDamage, 0);
  assert.equal(growlResult.enemyDamage, TEMPORARY_ATTACK_DAMAGE);

  // Reset the wild back to full before the second hit so both attacks are
  // measured against the same starting HP.
  seedLevel100BulbasaurSession("p1");

  const scratchResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);
  assert.equal(scratchResult.status, "success");
  if (scratchResult.status !== "success") return;
  assert.equal(scratchResult.playerDamage, SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);
  assert.equal(scratchResult.enemyDamage, TEMPORARY_ATTACK_DAMAGE);

  assert.notEqual(scratchResult.playerDamage, growlResult.playerDamage);
});

// ===========================================================================
// Phase 5E — Accuracy & Miss
// ===========================================================================

// mega-kick: physical, Normal-type, power 120, accuracy 75 — a real Move
// Registry entry with an accuracy below 100, used (rather than a fixture)
// so this is genuine end-to-end coverage against the real registry, same
// rule move-damage-query.test.ts's own doc comment already follows.
//   charmander Attack@100 = 109, bulbasaur Defense@100 = 103, levelFactor@100 = 42
//   raw = 42*120*109/103 = 5333.598...; baseDamage = floor(5333.598/50+2) = 108
//   mega-kick is Normal-type (charmander is Fire-type: no STAB) vs.
//   bulbasaur (Grass/Poison: both neutral to Normal, multiplier 1) — STAB
//   and Type Effectiveness are both neutral here on purpose, isolating the
//   accuracy check as the only thing under test.
const MEGA_KICK_BASE_DAMAGE = 108;

function seedMegaKickActivePokemon(id: string, playerId: string, currentHp: number) {
  const pokemon = seedPlayerPokemon({ id, playerId, speciesId: "charmander", level: 100, currentHp, partySlot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "mega-kick", slot: 1 });
  return pokemon;
}

test("a low-accuracy move (mega-kick, 75) can hit, dealing its calculated damage", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMegaKickActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  // MIN_ROLL_NO_CRIT_RANDOM_SOURCE (0.05) -> rollDamageRandomFactor = 0.85
  // (minimum), rollAccuracyCheck = 5 (well below 75) -> guaranteed hit, and
  // rollCriticalHit = 0.05 (just above the 1/24 threshold) -> guaranteed
  // non-critical, so this test isolates the accuracy hit alone.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "mega-kick", MIN_ROLL_NO_CRIT_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  // afterRandom = floor(108 * 0.85) = floor(91.8) = 91; no STAB, no
  // effectiveness change (both neutral), no critical -> final damage 91.
  const expectedDamage = Math.floor(MEGA_KICK_BASE_DAMAGE * 0.85);
  assert.equal(expectedDamage, 91);
  assert.equal(result.playerDamage, expectedDamage);
  assert.equal(result.updatedWildHp, BULBASAUR_LEVEL_100_MAX_HP_VALUE - expectedDamage);
  // The wild survived, so its own unchanged counter-attack still lands —
  // a hit changes nothing else about the rest of the turn.
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
});

test("a low-accuracy move (mega-kick, 75) can miss, dealing zero damage while the battle continues normally", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMegaKickActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  // random() just under 1 -> rollAccuracyCheck = 99, which is >= 75 ->
  // guaranteed miss (the same source that would otherwise roll the maximum
  // 1.00 damage factor, proving the miss happens before that value is ever
  // used for anything).
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "mega-kick", MAX_ROLL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  // No damage, no HP change on the wild's side...
  assert.equal(result.playerDamage, 0);
  assert.equal(result.updatedWildHp, BULBASAUR_LEVEL_100_MAX_HP_VALUE);
  assert.equal(result.wildFainted, false);
  assert.equal(
    getFieldBattleSessionRow("owner-1")?.wildCurrentHp,
    BULBASAUR_LEVEL_100_MAX_HP_VALUE,
    "a miss must leave the wild's persisted HP completely untouched"
  );

  // ...but the battle continues normally: the wild's own counter-attack is
  // entirely unaffected by whether the player's own attack landed.
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.battleEnded, false);
});

test("a full-accuracy move (scratch, 100) never misses even on the highest possible accuracy roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MAX_ROLL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.playerDamage, SCRATCH_VS_LEVEL_100_BULBASAUR_DAMAGE);
});

// ===========================================================================
// Phase 5F — Critical Hit
// ===========================================================================

// random() = 0 -> rollDamageRandomFactor = 0.85 (minimum), rollAccuracyCheck
// = 0 (a guaranteed hit against any real move's accuracy), AND
// rollCriticalHit = 0 (well below the 1/24 critical-hit threshold) — a
// guaranteed critical, deliberately reusing the same "roll everything to
// its floor" source that predates Phase 5F, now also proving the critical
// multiplier applies inside the live Battle Action Service.
const GUARANTEED_CRITICAL_RANDOM_SOURCE = () => 0;

test("a guaranteed critical hit multiplies the live service's calculated damage by 1.5", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const normalResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", MIN_ROLL_NO_CRIT_RANDOM_SOURCE);
  assert.equal(normalResult.status, "success");
  if (normalResult.status !== "success") return;
  // Same 0.85 minimum random factor as the guaranteed-critical roll below,
  // but without the critical — isolates the 1.5x multiplier as the only
  // difference between the two results.
  assert.equal(normalResult.playerDamage, 31);

  seedLevel100BulbasaurSession("p1");

  const criticalResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", GUARANTEED_CRITICAL_RANDOM_SOURCE);
  assert.equal(criticalResult.status, "success");
  if (criticalResult.status !== "success") return;
  // afterRandom = floor(37*0.85) = 31 (no STAB/effectiveness change, both
  // neutral); critical: floor(31*1.5) = floor(46.5) = 46.
  assert.equal(criticalResult.playerDamage, 46);
  assert.equal(criticalResult.playerDamage, Math.floor(normalResult.playerDamage * 1.5));
  assert.equal(criticalResult.updatedWildHp, BULBASAUR_LEVEL_100_MAX_HP_VALUE - 46);
});

test("a critical hit still lets the wild's own unaffected counter-attack land normally", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", GUARANTEED_CRITICAL_RANDOM_SOURCE);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
});

test("a session referencing an unrecognized wild species is treated as battle-inactive rather than crashing", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "not-a-real-species",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");

  assert.deepEqual(result, { status: "battle-inactive" });
  assert.equal(getPlayerPokemonUpdateCallCount(), 0, "no damage may ever be applied against an unresolvable wild");
});
