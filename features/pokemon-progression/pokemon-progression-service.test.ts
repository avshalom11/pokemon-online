// MOVE-LEARNING OPTIMIZATION — focused tests for applyPokemonXpGrant's
// no-level-up skip. Move-learning rules/learnsets/level-up behavior are
// completely unchanged (see move-learning-service.test.ts and
// engine/move-learning's own suite for that coverage) — this file only
// proves the *decision to even ask the planner* is now gated on an actual
// level gain, using a call-count counter on the exact table
// applyLevelUpMoveLearning reads first (loadKnownMoveSet's own
// playerKnownMove.findMany), since a skipped call and a real call against
// empty data would otherwise return identically-shaped results.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test, beforeEach } from "node:test";

import { applyPokemonXpGrant } from "./pokemon-progression-service.ts";
import { getTotalXpRequiredForPokemonLevel } from "./pokemon-progression-calculations.ts";
import { prisma } from "@/lib/db/prisma";
import {
  getPlayerKnownMoveFindManyCallCount,
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
} from "../../test/support/fakes/prisma.fake.ts";

const POKEMON_ID = "mon-1";
const LEVEL_10_XP = getTotalXpRequiredForPokemonLevel(10); // total XP at which level 10 begins

beforeEach(() => {
  resetFakeDb();
  seedPlayerPokemon({ id: POKEMON_ID, playerId: "owner-1", speciesId: "charmander", level: 10, experience: LEVEL_10_XP, currentHp: 30 });
  seedKnownMove({ playerPokemonId: POKEMON_ID, moveId: "scratch", slot: 1 });
});

test("no level-up: a small XP grant that stays within the current level never queries move-learning at all", async () => {
  assert.equal(getPlayerKnownMoveFindManyCallCount(), 0);

  const result = await prisma.$transaction((tx) => applyPokemonXpGrant(tx, POKEMON_ID, 5, "finisher", 1, "wildBattleVictory"));

  assert.equal(result.previousLevel, result.newLevel, "this grant must not have leveled the Pokémon up");
  assert.equal(getPlayerKnownMoveFindManyCallCount(), 0, "no level gained -> the move-learning planner must never even be asked");

  // The synthetic no-op plan must still be well-formed (same shape a real
  // empty-interval call would produce) so nothing downstream ever sees a
  // missing/malformed moveLearning field.
  assert.deepEqual(result.moveLearning.detectedMoves, []);
  assert.deepEqual(result.moveLearning.automaticallyLearnedMoveIds, []);
  assert.deepEqual(result.moveLearning.pendingMoves, []);
  assert.equal(result.moveLearning.oldLevel, result.previousLevel);
  assert.equal(result.moveLearning.newLevel, result.newLevel);
});

test("level-up: an XP grant that crosses into the next level still runs the real move-learning logic", async () => {
  assert.equal(getPlayerKnownMoveFindManyCallCount(), 0);

  // Level 10 -> 11 requires 1000 XP (10 * XP_PER_POKEMON_LEVEL); granting
  // well more than that guarantees at least one level gained.
  const result = await prisma.$transaction((tx) => applyPokemonXpGrant(tx, POKEMON_ID, 1500, "finisher", 1, "wildBattleVictory"));

  assert.ok(result.newLevel > result.previousLevel, "this grant must have leveled the Pokémon up");
  assert.ok(
    getPlayerKnownMoveFindManyCallCount() > 0,
    "a real level-up must still ask the move-learning planner exactly as before"
  );
});

test("no level-up (exact boundary — 0 XP gained): still skips move-learning", async () => {
  const result = await prisma.$transaction((tx) => applyPokemonXpGrant(tx, POKEMON_ID, 0, "finisher", 1, "wildBattleVictory"));

  assert.equal(result.previousLevel, result.newLevel);
  assert.equal(getPlayerKnownMoveFindManyCallCount(), 0);
});

// XP BALANCE — isolation: grantBattlePokemonXp/calculateBaseBattlePokemonXp
// (this whole file's own subject) have exactly one real call site each in
// the entire app — both inside the wild Field Battle victory path
// (battle-session.service.ts's applyWildHpSync). Gym/League battles grant
// Pokémon XP (if at all) through their own, entirely separate services, so
// this source-level check is a fast, deterministic guard that a future
// edit here can never silently start affecting Gym/League XP by having
// their services start importing this module.
function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) =>
    entry.isDirectory()
      ? listTsFiles(`${dir}/${entry.name}`)
      : entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
        ? [`${dir}/${entry.name}`]
        : []
  );
}

test("XP BALANCE: Gym and League services never import the wild-battle Pokémon XP functions this task changed", () => {
  const forbidden = ["grantBattlePokemonXp", "calculateBaseBattlePokemonXp", "getLevelDifferenceXpMultiplier"];
  for (const dir of ["features/gyms/services", "features/leagues/services"]) {
    for (const file of listTsFiles(dir)) {
      const src = readFileSync(file, "utf8");
      for (const name of forbidden) {
        assert.ok(!src.includes(`${name}(`), `${file} must never call ${name} — Gym/League XP must stay on their own separate path`);
      }
    }
  }
});
