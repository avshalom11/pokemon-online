// Phase 7 integration tests — Volatile Conditions wired through the real
// executeBattleAction (only "@/lib/db/prisma" redirected to the in-memory
// fake). Complements (does not duplicate) the pure-module tests in
// features/battle/volatile — these prove the SERVICE actually threads
// persisted volatile state, HP, and event ordering together end-to-end.
// Seeding playerVolatileState/wildVolatileState directly (rather than
// relying on a real move to apply the condition first) keeps each test
// deterministic and focused on exactly one behavior.
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

function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function maxHpAtLevel(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`test setup: ${speciesId} species not found`);
  return calculatePokemonHpStat(species.baseStats.health, level);
}

const ENEMY_NORMAL_HIT = [0.999999, 0, 0.999999];

test("flinch prevents exactly the flinched actor's action, without a move-used event, and clears afterward", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId: "p1",
    playerVolatileState: { flinch: true },
  });

  // Charmander (faster) is flinched and consumes no roll; the enemy still
  // gets its own normal turn afterward.
  const randomSource = sequenceRandomSource([0.5, 0.5, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.playerDamage, 0);
  assert.ok(result.events.some((event) => event.type === "volatile-prevented-action" && event.actor === "player" && event.condition === "flinch"));
  assert.ok(!result.events.some((event) => event.type === "move-used" && event.actor === "player"));
  assert.equal(result.playerVolatile.confused, false);
});

test("a confusion self-hit skips the selected move entirely and can damage the confused Pokémon", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId: "p1",
    playerVolatileState: { confusion: { turnsRemaining: 3 } },
  });

  // enemySelect, tieBreak, confusion selfHitRoll (< 0.5 -> hurts itself),
  // confusion self-damage random factor, then the enemy's own normal turn.
  const randomSource = sequenceRandomSource([0.5, 0.5, 0.1, 0.999999, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.playerDamage, 0, "the selected move never executed");
  assert.ok(!result.events.some((event) => event.type === "move-used" && event.actor === "player"));
  assert.ok(result.events.some((event) => event.type === "confusion-self-damage" && event.actor === "player"));
  assert.ok(result.updatedPartyHp < 999_999, "confusion self-damage must have actually reduced HP");
});

test("Protect blocks an incoming attack: no damage, no effects, just a protected event", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId: "p1",
    wildVolatileState: { protect: { active: true, consecutiveUses: 1 } },
  });

  const randomSource = sequenceRandomSource([0.99, 0.5, 0.999999, 0, 0.999999, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedWildHp, maxHp);
  assert.ok(result.events.some((event) => event.type === "protected" && event.actor === "enemy"));
  // Only the wild (the protected side) must never take damage — the
  // enemy's own unprotected counterattack against the player afterward is
  // untouched by the wild's own Protect.
  assert.ok(!result.events.some((event) => event.type === "damage-dealt" && event.target === "enemy"));
});

test("Leech Seed damages the seeded wild at end of turn and heals the player by the actual amount lost", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // Below max HP (so there's room to actually receive healing) but high
  // enough that the enemy's own counterattack can't faint the player
  // before Leech Seed's own end-of-turn heal has a chance to apply.
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 150, partySlot: 1 });
  // Growl (a status move, no damage) keeps the wild's HP change entirely
  // attributable to Leech Seed's own end-of-turn tick.
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId: "p1",
    wildVolatileState: { leechSeed: { source: "player" } },
  });

  // enemySelect, tieBreak, player's growl (rf/acc/crit are always drawn
  // regardless of category), then the enemy's own normal turn.
  const randomSource = sequenceRandomSource([0.99, 0.5, 0.999999, 0, 0.999999, ...ENEMY_NORMAL_HIT]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const expectedSeedDamage = Math.floor(maxHp / 8);
  assert.equal(result.updatedWildHp, maxHp - expectedSeedDamage);
  const healedEvent = result.events.find((event) => event.type === "healed" && event.actor === "player" && event.source === "drain");
  assert.ok(healedEvent && healedEvent.type === "healed");
  assert.equal(healedEvent.amount, expectedSeedDamage);
});

test("a disabled move is rejected by server validation, and Encore restricts selection to only the forced move", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 999_999, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 2 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
    playerVolatileState: { disable: { moveId: "scratch", turnsRemaining: 2 } },
  });

  const disabledResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");
  assert.equal(disabledResult.status, "invalid-move");

  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
    playerVolatileState: { encore: { moveId: "scratch", turnsRemaining: 2 } },
  });

  const wrongMoveResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.equal(wrongMoveResult.status, "invalid-move");
});
