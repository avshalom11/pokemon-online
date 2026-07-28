// Phase 6J-6L integration tests — healing, drain, recoil, and multi-hit
// moves wired through the real executeBattleAction (only "@/lib/db/prisma"
// redirected to the in-memory fake). Complements (does not duplicate) the
// pure-module tests in features/battle/healing and
// features/battle/multi-hit — these prove the SERVICE actually wires the
// calculations, HP updates, and event ordering together end-to-end.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { executeBattleAction } from "@/features/battle/services/battle-action.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPlayerProfile,
  seedFieldBattleSession,
  getPlayerPokemonRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

beforeEach(() => {
  resetFakeDb();
});

function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function maxHpAtLevel(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`test setup: ${speciesId} species not found`);
  return calculatePokemonHpStat(species.baseStats.health, level);
}

function seedBulbasaurSession(wildCurrentHp?: number) {
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  return seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: wildCurrentHp ?? maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId: "p1",
  });
}

// Charmander (faster than bulbasaur@100) always acts first below — the
// enemy's own turn (when it happens at all) always uses bulbasaur's real
// starting move, a plain damaging hit with no secondary effect, so its
// own random sequence is always exactly [rf, acc, crit] = [0.999999, 0,
// 0.999999] (hit, no crit) unless the test deliberately supplies
// something else.
const ENEMY_NORMAL_HIT = [0.999999, 0, 0.999999];

test("Recover restores 50% of MAXIMUM hp and emits move-used, healed", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const maxHp = maxHpAtLevel("charmander", 100);
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 10, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "recover", slot: 1 });
  seedBulbasaurSession();

  // enemySelect, tieBreak, then the enemy's own attack (player goes first
  // but consumes no roll for a healing move).
  const randomSource = sequenceRandomSource([0.5, 0.5, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "recover", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.deepEqual(result.events.slice(0, 2).map((event) => event.type), ["move-used", "healed"]);
  const expectedHealed = Math.floor(maxHp * 0.5);
  // The enemy still gets its own turn afterward (healing doesn't faint the
  // wild), so the final HP also reflects its counterattack.
  assert.equal(result.updatedPartyHp, Math.max(0, 10 + expectedHealed - result.enemyDamage));
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, result.updatedPartyHp);
});

test("a healing move at full hp changes nothing and emits healing-failed", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const maxHp = maxHpAtLevel("charmander", 100);
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: maxHp, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "recover", slot: 1 });
  seedBulbasaurSession();

  const randomSource = sequenceRandomSource([0.5, 0.5, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "recover", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.deepEqual(result.events.slice(0, 2).map((event) => event.type), ["move-used", "healing-failed"]);
  assert.equal(result.updatedPartyHp, Math.max(0, maxHp - result.enemyDamage));
});

test("a drain move heals the attacker based on ACTUAL hp lost by the target, not raw calculated damage", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 10, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "leech-life", slot: 1 });
  // The wild has only 3 HP left — far less than leech-life's calculated
  // damage — so the actual loss (and therefore the drain) is based on 3.
  seedBulbasaurSession(3);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "leech-life", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedWildHp, 0, "the wild must faint from the actual 3 HP it had left");
  const healedEvent = result.events.find((event) => event.type === "healed" && event.actor === "player");
  assert.ok(healedEvent && healedEvent.type === "healed");
  assert.ok(healedEvent.amount > 0 && healedEvent.amount <= 3, `drain must be based on the 3 actual HP lost, got ${healedEvent.amount}`);
  assert.equal(result.updatedPartyHp, 10 + healedEvent.amount);
});

test("recoil can faint the attacker, and both faints appear in chronological order", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // 1 HP: any positive recoil (always >= 1 once it applies) faints it.
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-edge", slot: 1 });
  seedBulbasaurSession();

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-edge", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedPartyHp, 0);
  assert.equal(result.partyPokemonFainted, true);

  const types = result.events.map((event) => event.type);
  const recoilIndex = types.indexOf("recoil-damage");
  const playerFaintedIndex = types.findIndex((type, index) => type === "fainted" && result.events[index].actor === "player");
  assert.ok(recoilIndex >= 0 && playerFaintedIndex > recoilIndex, "recoil-damage must be followed by the attacker's own fainted event");
});

test("both sides can faint in the same action: wild from the hit, attacker from its own recoil", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-edge", slot: 1 });
  seedBulbasaurSession(1);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-edge", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.wildFainted, true);
  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true, "a single-Pokémon party ends the battle when it faints");
  // Explicit double-faint resolution: the player's own defeat (battleEnded)
  // takes priority over the wild also fainting — a mutual knockout is a
  // loss for the player, not an accidental "player" win.
  assert.equal(result.winner, "wild");
  assert.ok(result.experienceGranted !== null, "the wild-defeat XP reward is still granted despite the player also fainting");

  const types = result.events.map((event) => event.type);
  const damageDealtIndex = types.indexOf("damage-dealt");
  const enemyFaintedIndex = types.findIndex((type, index) => type === "fainted" && result.events[index].actor === "enemy");
  const recoilIndex = types.indexOf("recoil-damage");
  const playerFaintedIndex = types.findIndex((type, index) => type === "fainted" && result.events[index].actor === "player");

  assert.ok(damageDealtIndex < enemyFaintedIndex, "the wild's own faint follows the damage that caused it");
  assert.ok(enemyFaintedIndex < recoilIndex, "recoil is resolved after the target's faint");
  assert.ok(recoilIndex < playerFaintedIndex, "the attacker's own faint follows its recoil");
  // No second action is ever attempted once both sides are down. The
  // wild's own Pokémon genuinely fainted too, so the skip (if present)
  // must use "fainted-before-action", not "no-valid-target".
  const skippedEvent = result.events.find((event) => event.type === "action-skipped");
  if (skippedEvent && skippedEvent.type === "action-skipped") {
    assert.equal(skippedEvent.reason, "fainted-before-action");
  }
});

test("recoil fainting the attacker (without also fainting the target) skips the second action with no-valid-target", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-edge", slot: 1 });
  // High wild HP — only the attacker (player) faints from recoil here,
  // the target (wild) survives comfortably.
  seedBulbasaurSession(9999);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-edge", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.wildFainted, false);
  assert.equal(result.partyPokemonFainted, true);

  const skippedEvent = result.events.find((event) => event.type === "action-skipped");
  assert.ok(skippedEvent && skippedEvent.type === "action-skipped");
  assert.equal(skippedEvent.actor, "enemy");
  assert.equal(skippedEvent.reason, "no-valid-target", "the enemy's own Pokémon never fainted — there's simply no one left to attack");
});

test("a fixed 2-hit move (Double Kick) always hits exactly twice and consumes no hit-count roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-kick", slot: 1 });
  seedBulbasaurSession();

  // Player: rf1, acc(hit), crit1 (hit 1) then rf2, crit2 (hit 2, guaranteed,
  // no accuracy roll) — no hit-count roll for a fixed 2-2 move. Then the
  // enemy's own normal hit.
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0.999999, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-kick", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const completeEvent = result.events.find((event) => event.type === "multi-hit-complete");
  assert.ok(completeEvent && completeEvent.type === "multi-hit-complete");
  assert.equal(completeEvent.hits, 2);
  assert.equal(result.events.filter((event) => event.type === "damage-dealt" && event.actor === "player").length, 2);
});

test("a variable multi-hit move (Double Slap) resolves a deterministic hit count from its injected roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-slap", slot: 1 });
  // High wild HP so the sequence completes all rolled hits without fainting.
  seedBulbasaurSession(9999);

  // Player: rf1, acc(hit), crit1, then hitCountRoll=0.8 -> 4 hits (3/8,3/8,
  // 1/8,1/8 thresholds: 0.8 falls in the 4th bucket -> 4 hits), then 3 more
  // (rf, crit) pairs for hits 2-4. Then the enemy's own normal hit.
  const randomSource = sequenceRandomSource([
    0.5, 0.5,
    0.999999, 0, 0.999999,
    0.8,
    0.999999, 0.999999,
    0.999999, 0.999999,
    0.999999, 0.999999,
    ...ENEMY_NORMAL_HIT,
  ]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-slap", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const completeEvent = result.events.find((event) => event.type === "multi-hit-complete");
  assert.ok(completeEvent && completeEvent.type === "multi-hit-complete");
  assert.equal(completeEvent.hits, 4);
  assert.equal(result.events.filter((event) => event.type === "damage-dealt" && event.actor === "player").length, 4);
});

test("a missed multi-hit move lands 0 hits and draws no hit-count or per-hit rolls", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-slap", slot: 1 });
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedBulbasaurSession();

  // accuracyRoll floor(0.9*100)=90 >= double-slap's accuracy 85 -> miss.
  // Only rf/acc/crit are drawn for the player; nothing else. enemySelect
  // 0.99 -> index 3 of bulbasaur's 4 starting moves (solar-beam) rather
  // than the default 0.5 (which happens to select double-edge, a recoil
  // move that would change the wild's own HP too and defeat this test's
  // "the missed move left the wild's HP untouched" assertion).
  const randomSource = sequenceRandomSource([0.99, 0.5, 0.999999, 0.9, 0.999999, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-slap", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.deepEqual(result.events.slice(0, 2).map((event) => event.type), ["move-used", "move-missed"]);
  assert.ok(!result.events.some((event) => event.type === "multi-hit-complete"));
  assert.equal(result.updatedWildHp, maxHp, "a missed multi-hit move deals no damage at all");
});

test("multi-hit stops immediately once the target faints, reporting only the completed hits", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "double-kick", slot: 1 });
  // 1 HP: hit 1 alone faints the wild, so hit 2 never runs (and draws no
  // roll for it) even though Double Kick is a fixed 2-hit move.
  seedBulbasaurSession(1);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "double-kick", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.wildFainted, true);
  const completeEvent = result.events.find((event) => event.type === "multi-hit-complete");
  assert.ok(completeEvent && completeEvent.type === "multi-hit-complete");
  assert.equal(completeEvent.hits, 1);
  assert.equal(result.events.filter((event) => event.type === "damage-dealt" && event.actor === "player").length, 1);
  // The second actor's own turn never happens either, since the wild it
  // would need to attack with is already fainted.
  assert.ok(result.events.some((event) => event.type === "action-skipped" && event.actor === "enemy"));
});
