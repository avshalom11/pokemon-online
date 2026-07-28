// Phase 5H regression/integration tests for the wild's own real turn inside
// the Battle Action Service — see battle-action.service.persistence.test.ts
// for the broader Phase 4F/5A-5H suite this complements. These tests focus
// specifically on proving the enemy's selected move goes through the exact
// same Damage Engine pipeline the player's own attack uses (Accuracy, STAB,
// Type Effectiveness, Critical Hits, Battle Outcome Metadata), not on
// re-testing move selection uniformity itself (see
// features/battle/ai/select-enemy-move.test.ts for that).
//
// Runs the REAL executeBattleAction unmodified; only "@/lib/db/prisma" is
// redirected to an in-memory fake (test/support/fakes/prisma.fake.ts).
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

// A stateful randomSource that returns each value in `values` once, in
// order (repeating from the start if ever exhausted) — unlike the fixed
// constants battle-action.service.persistence.test.ts uses elsewhere, this
// lets a single executeBattleAction call independently control every roll
// drawn this turn, in the exact order the service draws them (Phase 6):
// 1. enemy move selection, 2. the turn-order tie-break, 3-5. the FIRST
// actor's damage-random-factor/accuracy/critical, 6-8. the SECOND actor's
// same three (only drawn if the first action didn't just faint it).
// Charmander is faster than every wild used in this file, so the player is
// always the first actor below and the enemy is always the second.
function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function seedScratchOnlyActivePokemon(id: string, playerId: string, currentHp: number) {
  const pokemon = seedPlayerPokemon({ id, playerId, speciesId: "charmander", level: 100, currentHp, partySlot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  return pokemon;
}

function maxHpAtLevel(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`test setup: ${speciesId} species not found in the catalog`);
  return calculatePokemonHpStat(species.baseStats.health, level);
}

function seedLevel100BulbasaurSession(activePlayerPokemonId: string) {
  const maxHp = maxHpAtLevel("bulbasaur", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 100,
    wildCurrentHp: maxHp,
    wildMaxHp: maxHp,
    activePlayerPokemonId,
  });
}

// --- Item 5/6/7/8: the enemy's selected move goes through the normal ------
// --- battle pipeline (Accuracy, STAB, Type Effectiveness) ------------------

// bulbasaur@100's derived Known Moves are ["sleep-powder", "take-down",
// "double-edge", "solar-beam"] (getStartingKnownMoves). A move-selection
// roll of 0.999999 -> index floor(0.999999*4) = 3 -> "solar-beam" (special,
// Grass, power 120, accuracy 100). Hand-computed and cross-checked directly
// against resolveAttackDamage:
//   bulbasaur SpecialAttack@100 = 135, charmander SpecialDefense@100 = 105
//   levelFactor@100 = 42; raw = 42*120*135/105 = 6480
//   baseDamage = floor(6480/50+2) = 131; afterRandom (rf=1.0) = 131
//   STAB (bulbasaur is Grass, solar-beam is Grass): floor(131*1.5) = 196
//   Type Effectiveness (Grass vs. Fire = not-very-effective, 0.5x):
//     floor(196*0.5) = 98
//   accuracyRoll 99 < accuracy 100 -> hit; criticalRoll 0.999999 -> no crit
//   final damage = 98
test("the wild's own turn selects a real Known Move and runs it through the same Accuracy/STAB/Type-Effectiveness pipeline as the player's attack", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedScratchOnlyActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  const randomSource = sequenceRandomSource([0.999999, 0.999999, 0.999999, 0.999999, 0.999999, 0.999999, 0.999999, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.enemyDamage, 98);
  assert.equal(result.updatedPartyHp, 100 - 98);
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 100 - 98);
});

// --- Item 6: Accuracy — the enemy's own attack can miss --------------------

test("the enemy's own attack can miss due to a real Accuracy check, dealing zero damage", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedScratchOnlyActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");

  // Enemy selects "take-down" (selection roll 0.3 -> floor(0.3*4)=1,
  // physical, Normal, power 90, accuracy 85); the tie-break roll (0.5) is
  // irrelevant since charmander is faster and always goes first here.
  // Player: rf=1.0 (max), accuracyRoll=0 (guaranteed hit), critRoll=1.0
  // (no crit) -> scratch deals its normal 37, the wild survives (200 HP).
  // Enemy's own accuracyRoll 90 is NOT less than 85, so take-down misses
  // outright — 0 damage, regardless of the damage-random-factor/critical
  // rolls also drawn for it.
  const randomSource = sequenceRandomSource([0.3, 0.5, 0.999999, 0, 0.999999, 0.5, 0.9, 0.5]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.playerDamage, 37);
  assert.equal(result.enemyDamage, 0);
  assert.equal(result.updatedPartyHp, 100, "a missed enemy attack must leave the active Pokémon's HP untouched");
});

// --- Item 9: Critical Hits still work for the enemy's own attack -----------

test("a critical hit on the enemy's own attack multiplies its calculated damage by 1.5, exactly like the player's own critical hits", async () => {
  seedPlayerProfile({ id: "owner-1" });

  // bulbasaur@100's index-2 Known Move, "double-edge" (physical, Normal,
  // power 120, accuracy 100) — selection roll 0.6 -> floor(0.6*4) = 2.
  // Neither STAB (double-edge is Normal-type, bulbasaur isn't) nor Type
  // Effectiveness (Normal vs. Fire is neutral, 1x) apply here, isolating
  // the critical multiplier as the only variable between the two calls
  // below.
  //   bulbasaur Attack@100 = 103, charmander Defense@100 = 91
  //   levelFactor@100 = 42; raw = 42*120*103/91 = 5704.615...
  //   baseDamage = floor(5704.615/50+2) = 116; afterRandom (rf=1.0) = 116
  //   no crit: final damage = 116
  //   guaranteed crit: floor(116*1.5) = 174

  seedScratchOnlyActivePokemon("p1", "owner-1", 100);
  seedLevel100BulbasaurSession("p1");
  const noCritSource = sequenceRandomSource([0.6, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.5]);
  const noCritResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", noCritSource);
  assert.equal(noCritResult.status, "success");
  if (noCritResult.status !== "success") return;
  assert.equal(noCritResult.enemyDamage, 116);

  seedScratchOnlyActivePokemon("p2", "owner-1", 100);
  seedLevel100BulbasaurSession("p2");
  const criticalSource = sequenceRandomSource([0.6, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0]);
  const criticalResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", criticalSource);
  assert.equal(criticalResult.status, "success");
  if (criticalResult.status !== "success") return;
  assert.equal(criticalResult.enemyDamage, 174);
  assert.equal(criticalResult.enemyDamage, Math.floor(noCritResult.enemyDamage * 1.5));
});

// --- Item 7/8: STAB and Type Effectiveness both apply to the enemy's own --
// --- attack, using the WILD's own species types, not the player's ---------

test("STAB and Type Effectiveness both apply to the enemy's own attack, computed from the wild's own species types", async () => {
  seedPlayerProfile({ id: "owner-1" });

  // Both battlers at level 20 here (not the level-100/level-3 mismatches
  // used elsewhere in this file): a level-100 attacker would one-shot a
  // low-level squirtle before its own turn is ever reached, and a
  // level-100 squirtle would rotate water-gun out of its derived Known
  // Moves entirely (getStartingKnownMoves keeps only the 4 most recently
  // learned level-up moves — see engine/known-moves/starting-moves). Level
  // 20 keeps water-gun in range and keeps both sides' HP comfortably
  // above the damage either side actually deals.
  const pokemon = seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 20, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: pokemon.id, moveId: "scratch", slot: 1 });

  const wildMaxHp = maxHpAtLevel("squirtle", 20);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "squirtle",
    wildLevel: 20,
    wildCurrentHp: wildMaxHp,
    wildMaxHp,
    activePlayerPokemonId: "p1",
  });

  // Player's scratch@20 vs squirtle@20 deals 8 (well under its 47 max HP),
  // so the wild survives and takes its own turn.
  //
  // squirtle@20's derived Known Moves are ["water-gun", "withdraw",
  // "bite", "bubble"] — selection roll 0.1 -> floor(0.1*4) = 0 ->
  // "water-gun" (special, Water, power 40, accuracy 100).
  //   squirtle SpecialAttack@20 = floor(2*50*20/100)+5 = 25
  //   charmander SpecialDefense@20 = floor(2*50*20/100)+5 = 25
  //   levelFactor@20 = 2*20/5+2 = 10; raw = 10*40*25/25 = 400
  //   baseDamage = floor(400/50+2) = 10; afterRandom (rf=1.0) = 10
  //   STAB (squirtle is Water, water-gun is Water): floor(10*1.5) = 15
  //   Type Effectiveness (Water vs. Fire = super-effective, 2x):
  //     floor(15*2) = 30
  //   final damage = 30
  const randomSource = sequenceRandomSource([0.1, 0.5, 0.999999, 0, 0.999999, 0.999999, 0, 0.999999]);
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", randomSource);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.playerDamage, 8);
  assert.equal(result.enemyDamage, 30);
});
