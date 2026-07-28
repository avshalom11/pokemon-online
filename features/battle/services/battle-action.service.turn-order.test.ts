// Phase 6B/6C integration tests — Turn Order by Speed and Move Priority,
// exercised through the real executeBattleAction (only "@/lib/db/prisma"
// redirected to the in-memory fake, same harness every other
// battle-action.service.*.test.ts file uses). Complements (does not
// duplicate) the exhaustive pure resolveTurnOrder tests in
// features/battle/turn-order/resolve-turn-order.test.ts — these prove the
// service actually wires real Speed/priority/random-draw order together,
// not the abstract resolver logic itself.
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
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

beforeEach(() => {
  resetFakeDb();
});

// Same stateful-sequence helper battle-action.service.enemy-move.test.ts
// already establishes: one value per random() call, in the exact order
// the service draws them (enemy selection, tie-break, then each acting
// side's damage-factor/accuracy/critical, in turn order).
function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function maxHpAtLevel(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`test setup: ${speciesId} species not found`);
  return calculatePokemonHpStat(species.baseStats.health, level);
}

function seedBulbasaurSession(activePlayerPokemonId: string, wildLevel: number) {
  const maxHp = maxHpAtLevel("bulbasaur", wildLevel);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId,
  });
}

// --- Speed ordering -----------------------------------------------------------------

test("a faster enemy attacks before a slower player (equal priority)", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // charmander@10 (Speed 18) is far slower than bulbasaur@100 (Speed 95).
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 10, currentHp: 100_000, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1", 100);

  // bulbasaur@100 selects index floor(0.999999*4)=3 -> "solar-beam".
  const randomSource = sequenceRandomSource([0.999999, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.events[0]?.type, "move-used");
  assert.equal(result.events[0]?.actor, "enemy", "the faster wild must act first");
});

test("a faster player attacks before a slower enemy (equal priority)", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // charmander@100 (Speed 135) is far faster than bulbasaur@3 (Speed 7).
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1", 3);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.events[0]?.type, "move-used");
  assert.equal(result.events[0]?.actor, "player", "the faster player must act first");
});

// --- Move priority overrides Speed --------------------------------------------------

test("a higher-priority move (Quick Attack) acts first even though its user is slower", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // Pikachu@1 (Speed 6) is slower than bulbasaur@3 (Speed 7) — by raw
  // Speed alone the wild would go first. Quick Attack's priority (+1)
  // must override that: pikachu still acts first.
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "pikachu", level: 1, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "quick-attack", slot: 1 });
  seedBulbasaurSession("p1", 3);

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "quick-attack", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.events[0]?.type, "move-used");
  assert.equal(result.events[0]?.actor, "player", "Quick Attack's priority must win even though pikachu is slower");
});

// --- Faint before acting -------------------------------------------------------------

test("a faster enemy that faints the player's Pokémon first prevents the player's pending attack", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // 1 HP: any real damaging hit that lands is guaranteed lethal (the
  // Damage Engine's own "at least 1 damage" floor). charmander@10 is far
  // slower than bulbasaur@100, so the wild's solar-beam (selection roll
  // 0.999999 -> index 3) goes first and is certain to be lethal here.
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 10, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1", 100);

  const randomSource = sequenceRandomSource([0.999999, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.playerDamage, 0, "the player's attack must never have run");
  assert.ok(result.enemyDamage > 0);
  assert.equal(result.battleEnded, true, "the party's only Pokémon fainted before it could act");
  assert.equal(result.winner, "wild");

  const eventTypes = result.events.map((event) => event.type);
  assert.deepEqual(eventTypes, ["move-used", "effectiveness", "damage-dealt", "fainted", "action-skipped"]);
  assert.equal(result.events[0]?.actor, "enemy");
  assert.deepEqual(result.events.at(-2), { type: "fainted", actor: "player", pokemonId: "p1" });
  assert.deepEqual(result.events.at(-1), { type: "action-skipped", actor: "player", reason: "fainted-before-action" });
});

// --- Battle events are returned in execution order ----------------------------------

test("a normal (non-fainting) turn returns both actors' events in the order they acted", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1", 100);

  const randomSource = sequenceRandomSource([0.999999, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  // charmander (faster) goes first: its own move-used/damage-dealt come
  // before the wild's.
  const firstMoveUsed = result.events.find((event) => event.type === "move-used");
  assert.equal(firstMoveUsed?.actor, "player");
  assert.equal(result.events[0], firstMoveUsed);

  const actors = result.events.filter((event) => event.type === "move-used").map((event) => event.actor);
  assert.deepEqual(actors, ["player", "enemy"]);
});
