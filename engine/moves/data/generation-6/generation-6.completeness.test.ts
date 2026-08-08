import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_6_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 6 (Kalos Moves & Learnsets Phase 3) introduces 60 new moves —
// the task's own explicit example list (Baby-Doll Eyes through Water
// Shuriken) plus the remaining Generation 6 moves needed for full X/Y and
// Omega Ruby/Alpha Sapphire coverage (Dragon Ascent, Magnetic Flux,
// Thousand Arrows, Thousand Waves). None of them collide with an existing
// Generation 1-5 move id, so this file's own total is the full 60, not a
// reduced count. Fairy became a playable type in Generation 6; the type
// itself was already supported by this schema (retroactively applied to
// Charm in Generation 2 — see generation-2/fairy.moves.ts), so no schema
// change was required here.
const EXPECTED_GENERATION_6_MOVE_COUNT = 60;

test("exactly 60 Generation 6 moves are loaded", () => {
  assert.equal(GENERATION_6_MOVES.length, EXPECTED_GENERATION_6_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_6_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_6_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 6 and introducedGeneration 6", () => {
  assert.ok(GENERATION_6_MOVES.every((move) => move.generation === 6));
  assert.ok(GENERATION_6_MOVES.every((move) => move.introducedGeneration === 6));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_6_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 6 move appears in the real registry by id", () => {
  for (const move of GENERATION_6_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 6 set alongside Generation 1/2/3/4/5", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 6).length, GENERATION_6_MOVES.length);
});

test("no Generation 6 move id collides with an existing Generation 1/2/3/4/5 move id", () => {
  const gen6Ids = new Set(GENERATION_6_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 6).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen6Ids.has(id));
  assert.deepEqual(collisions, []);
});

test("every Generation 6 move has a real Fairy, or any other already-supported, MoveType — no schema change was required", () => {
  const validTypes = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
  ]);
  for (const move of GENERATION_6_MOVES) {
    assert.ok(validTypes.has(move.type), `${move.id} has unsupported type "${move.type}"`);
  }
  assert.ok(GENERATION_6_MOVES.some((move) => move.type === "fairy"), "test assumption: at least one real Fairy-type move exists in Generation 6");
});

// Spot checks against known canonical data, matching generation-1/2/3/4/5's
// own "sourced from known move data" precedent.
test("spot check: Infestation reuses the existing partial-trap effect, same as Bind/Wrap/Clamp/Fire Spin", () => {
  assert.equal(getMoveById("infestation")!.effect.kind, "partial-trap");
});

test("spot check: Phantom Force reuses the existing charge-shaped (two-turn, invulnerable) simplification Shadow Force already established", () => {
  assert.deepEqual(getMoveById("phantom-force")!.effect, { kind: "charge", invulnerable: true });
});

test("spot check: Spiky Shield, Mat Block, King's Shield, and Crafty Shield are all approximated with the existing protect effect kind", () => {
  for (const id of ["spiky-shield", "mat-block", "kings-shield", "crafty-shield"]) {
    assert.equal(getMoveById(id)!.effect.kind, "protect");
    assert.equal(getMoveById(id)!.power, null);
  }
});

test("spot check: Draining Kiss and Oblivion Wing are drain moves, Light of Ruin is a recoil move", () => {
  assert.deepEqual(getMoveById("draining-kiss")!.effect, { kind: "drain", drainPercent: 75 });
  assert.deepEqual(getMoveById("oblivion-wing")!.effect, { kind: "drain", drainPercent: 75 });
  assert.deepEqual(getMoveById("light-of-ruin")!.effect, { kind: "recoil", recoilPercent: 50 });
});

test("spot check: unsupported-mechanic moves (terrain, entry hazards, type-changing, ability-gated) are registered but data-only no-op", () => {
  for (const id of [
    "electric-terrain", "grassy-terrain", "misty-terrain", "sticky-web",
    "forests-curse", "trick-or-treat", "topsy-turvy", "magnetic-flux",
    "flower-shield", "rototiller", "fairy-lock", "electrify", "ion-deluge", "powder",
  ]) {
    const move = getMoveById(id)!;
    assert.equal(move.effect.kind, "no-effect");
    assert.equal(move.power, null);
  }
});

test("spot check: Water Shuriken hits two to five times, matching Tail Slap's own multi-hit shape", () => {
  assert.deepEqual(getMoveById("water-shuriken")!.effect, { kind: "multi-hit", minHits: 2, maxHits: 5 });
});

test("spot check: chance-based self-buffs on a damaging move are dropped to plain damage (Diamond Storm), matching the existing Metal Claw/Ancient Power convention", () => {
  assert.deepEqual(getMoveById("diamond-storm")!.effect, { kind: "damage" });
});

test("spot check: guaranteed (100%) self-stat-drawback moves are modeled directly, matching the existing Superpower convention", () => {
  assert.deepEqual(getMoveById("dragon-ascent")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "defense", stages: -1 }, { stat: "specialDefense", stages: -1 }],
    chancePercent: 100,
  });
  assert.deepEqual(getMoveById("hyperspace-fury")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "defense", stages: -1 }],
    chancePercent: 100,
  });
});

test("priority moves carry their real priority value directly on the schema field, no special effect kind needed", () => {
  assert.equal(getMoveById("water-shuriken")!.priority, 1);
  assert.equal(getMoveById("baby-doll-eyes")!.priority, 1);
  assert.equal(getMoveById("electrify")!.priority, 1);
  assert.equal(getMoveById("ion-deluge")!.priority, 1);
  assert.equal(getMoveById("crafty-shield")!.priority, 3);
  assert.equal(getMoveById("spiky-shield")!.priority, 4);
  assert.equal(getMoveById("kings-shield")!.priority, 4);
});
