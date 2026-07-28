// Phase 6D-6I integration tests — Move Effects, Stat Stages, Major Status
// Conditions, wired through the real executeBattleAction (only
// "@/lib/db/prisma" redirected to the in-memory fake). Complements (does
// not duplicate) the exhaustive pure-module tests in
// features/battle/stats, features/battle/status, and
// features/battle/effects — these prove the SERVICE actually wires real
// persisted stages/status together, not the abstract mechanisms
// themselves.
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
  getFieldBattleSessionRow,
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

function seedBulbasaurSession(activePlayerPokemonId: string, wildStatus?: string | null) {
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  return seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId,
    wildStatus: wildStatus ?? null,
  });
}

// Charmander (faster than bulbasaur@100) always acts first below with a
// tie-break value that never matters, so every sequence is: [enemySelect,
// tieBreak, player's 3 rolls, (enemy's 3 rolls, only if it still gets to act)].

test("Thunder Wave guarantees paralysis on hit and it's persisted on the wild's session state", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "thunder-wave", slot: 1 });
  seedBulbasaurSession("p1");

  // rf/acc/crit for the player = 0.999999 -> guaranteed hit (accuracy 90).
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "thunder-wave", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.ok(result.events.some((event) => event.type === "status-applied" && event.actor === "enemy" && event.status === "paralysis"));
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildStatus, "paralysis");
});

test("an already-statused target rejects a new status, and its status is left unchanged", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "thunder-wave", slot: 1 });
  seedBulbasaurSession("p1", "poison");

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "thunder-wave", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.ok(
    result.events.some(
      (event) => event.type === "status-application-failed" && event.actor === "enemy" && event.reason === "already-statused"
    )
  );
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildStatus, "poison", "the pre-existing status must never be overwritten");
});

test("a damaging move's secondary status effect can apply when its chance roll succeeds", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "ember", slot: 1 });
  seedBulbasaurSession("p1");

  // Player rolls: rf=0.999999, acc=0 (hit), crit=0.999999 (no crit),
  // effectChance=0.05 -> 5% < ember's 10% burn chance -> succeeds.
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.05]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "ember", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.ok(result.events.some((event) => event.type === "status-applied" && event.actor === "enemy" && event.status === "burn"));
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildStatus, "burn");
});

test("a missed move applies no effect at all", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "thunder-wave", slot: 1 });
  seedBulbasaurSession("p1");

  // accuracyRoll 95 >= thunder-wave's accuracy 90 -> miss.
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0.95, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "thunder-wave", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  // Only the player's own move-used/move-missed pair is asserted here — the
  // enemy still gets its own separate turn afterward (a miss isn't a
  // faint), which is not what this test is about.
  assert.deepEqual(
    result.events.slice(0, 2).map((event) => event.type),
    ["move-used", "move-missed"]
  );
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildStatus, null);
});

test("an existing paralysis status can prevent the player's action", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // Paralysis halves effective Speed, so the wild (Speed 95) now goes
  // first instead of charmander (135 -> 67 while paralyzed) — a very high
  // HP means the wild's own attack (which goes first) can never faint the
  // player before we get to the player's own (prevented) turn.
  const pokemon = seedPlayerPokemon({
    id: "p1",
    playerId: "owner-1",
    speciesId: "charmander",
    level: 100,
    currentHp: 999_999,
    status: "paralysis",
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1");

  // enemySelect=0.5, tieBreak=0.5, enemy's rf/acc/crit=0.999999/0/0.999999
  // (a normal hit, no crit), then the player's own fullParalysisRoll=0 ->
  // < 0.25 -> fully paralyzed.
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.playerDamage, 0);
  assert.ok(result.events.some((event) => event.type === "status-prevented-action" && event.actor === "player" && event.status === "paralysis"));
  assert.equal(getPlayerPokemonRow("p1")?.status, "paralysis", "paralysis never clears on its own");
});

test("end-of-turn poison damage reduces HP, emits status-damage, and is persisted", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // High HP so the enemy's own regular attack this same turn can't already
  // faint the player — this test isolates the *residual* poison damage
  // specifically, applied only once the main attack phase is over.
  const pokemon = seedPlayerPokemon({
    id: "p1",
    playerId: "owner-1",
    speciesId: "charmander",
    level: 100,
    currentHp: 999_999,
    status: "poison",
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1");

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const maxHp = maxHpAtLevel("charmander", 100);
  const expectedResidual = Math.max(1, Math.floor(maxHp / 8));

  const statusDamageEvent = result.events.find((event) => event.type === "status-damage");
  assert.ok(statusDamageEvent);
  assert.equal(statusDamageEvent?.damage, expectedResidual);
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, result.updatedPartyHp);
  assert.ok(result.updatedPartyHp < 999_999, "poison's residual damage must actually have reduced HP");
});

test("end-of-turn status damage can faint a Pokémon and ends the battle when it's the last one", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({
    id: "p1",
    playerId: "owner-1",
    speciesId: "charmander",
    level: 100,
    currentHp: 1,
    status: "poison",
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });
  seedBulbasaurSession("p1");

  const randomSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedPartyHp, 0);
  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true);
  assert.ok(result.events.some((event) => event.type === "fainted" && event.actor === "player"));
});

test("a stat-stage debuff on the wild (Leer, -1 Defense) genuinely increases the player's subsequent damage", async () => {
  seedPlayerProfile({ id: "owner-1" });
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "leer", slot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 2 });
  seedBulbasaurSession("p1");

  const leerSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const leerResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "leer", leerSource);
  assert.equal(leerResult.status, "success");
  if (leerResult.status !== "success") return;
  assert.ok(leerResult.events.some((event) => event.type === "stat-stage-changed" && event.actor === "enemy" && event.stat === "defense"));

  const scratchSource = sequenceRandomSource([0.5, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const scratchResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", scratchSource);
  assert.equal(scratchResult.status, "success");
  if (scratchResult.status !== "success") return;

  // Baseline (no stages) scratch vs. bulbasaur@100 with MAX_ROLL is 37
  // (established in battle-action.service.persistence.test.ts) — with the
  // wild's Defense now at -1 stage, the same hit must deal noticeably more.
  assert.ok(scratchResult.playerDamage > 37, `expected debuffed damage > 37, got ${scratchResult.playerDamage}`);
});
