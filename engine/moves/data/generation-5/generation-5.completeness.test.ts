import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_5_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 5 (Unova Moves & Learnsets Phase 3) introduces 87 new moves —
// the task's own explicit example list (Acid Spray through Work Up) plus a
// handful of natural companions (Fire Pledge alongside Grass/Water Pledge,
// Incinerate, Electroweb, Chip Away) needed to round out type coverage for
// building real Unova learnsets. None of them collide with an existing
// Generation 1-4 move id, so this file's own total is the full 87, not a
// reduced count.
const EXPECTED_GENERATION_5_MOVE_COUNT = 87;

test("exactly 87 Generation 5 moves are loaded", () => {
  assert.equal(GENERATION_5_MOVES.length, EXPECTED_GENERATION_5_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_5_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_5_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 5 and introducedGeneration 5", () => {
  assert.ok(GENERATION_5_MOVES.every((move) => move.generation === 5));
  assert.ok(GENERATION_5_MOVES.every((move) => move.introducedGeneration === 5));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_5_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 5 move appears in the real registry by id", () => {
  for (const move of GENERATION_5_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 5 set alongside Generation 1/2/3/4", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 5).length, GENERATION_5_MOVES.length);
});

test("no Generation 5 move id collides with an existing Generation 1/2/3/4 move id", () => {
  const gen5Ids = new Set(GENERATION_5_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 5).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen5Ids.has(id));
  assert.deepEqual(collisions, []);
});

// Spot checks against known canonical data, matching generation-1/2/3/4's
// own "sourced from known move data" precedent.
test("spot check: Wild Charge and Head Charge are recoil moves", () => {
  assert.deepEqual(getMoveById("wild-charge")!.effect, { kind: "recoil", recoilPercent: 25 });
  assert.deepEqual(getMoveById("head-charge")!.effect, { kind: "recoil", recoilPercent: 25 });
});

test("spot check: Heal Pulse heals half the target's max HP", () => {
  const move = getMoveById("heal-pulse")!;
  assert.equal(move.category, "status");
  assert.equal(move.power, null);
  assert.deepEqual(move.effect, { kind: "heal", healPercent: 50 });
});

test("spot check: Freeze Shock / Ice Burn / Sky Drop reuse the existing charge-shaped (two-turn) simplification Giga Impact/Shadow Force already established", () => {
  assert.equal(getMoveById("freeze-shock")!.effect.kind, "charge");
  assert.equal(getMoveById("ice-burn")!.effect.kind, "charge");
  assert.deepEqual(getMoveById("sky-drop")!.effect, { kind: "charge", invulnerable: true });
});

test("spot check: Horn Leech heals the user for half the damage dealt", () => {
  const move = getMoveById("horn-leech")!;
  assert.deepEqual(move.effect, { kind: "drain", drainPercent: 50 });
});

test("spot check: Heat Crash and Heavy Slam reuse the existing weight-based-damage kind", () => {
  assert.equal(getMoveById("heat-crash")!.effect.kind, "weight-based-damage");
  assert.equal(getMoveById("heat-crash")!.power, null);
  assert.equal(getMoveById("heavy-slam")!.effect.kind, "weight-based-damage");
  assert.equal(getMoveById("heavy-slam")!.power, null);
});

test("spot check: unsupported-mechanic moves (Magic Room, Wonder Room, Telekinesis, Guard Split, Power Split, Rage Powder) are registered but data-only no-op", () => {
  for (const id of ["magic-room", "wonder-room", "telekinesis", "guard-split", "power-split", "rage-powder"]) {
    const move = getMoveById(id)!;
    assert.equal(move.effect.kind, "no-effect");
    assert.equal(move.power, null);
  }
});

test("spot check: Quick Guard and Wide Guard are approximated with the existing protect effect kind", () => {
  assert.equal(getMoveById("quick-guard")!.effect.kind, "protect");
  assert.equal(getMoveById("wide-guard")!.effect.kind, "protect");
});

test("spot check: Final Gambit is approximated as level-based fixed damage, the same simplification Night Shade/Seismic Toss already use", () => {
  assert.deepEqual(getMoveById("final-gambit")!.effect, { kind: "fixed-damage", damage: { basis: "level" } });
});

test("priority moves carry their real priority value directly on the schema field, no special effect kind needed", () => {
  assert.equal(getMoveById("circle-throw")!.priority, -6);
  assert.equal(getMoveById("dragon-tail")!.priority, -6);
  assert.equal(getMoveById("quick-guard")!.priority, 3);
  assert.equal(getMoveById("wide-guard")!.priority, 3);
  assert.equal(getMoveById("rage-powder")!.priority, 2);
  assert.equal(getMoveById("ally-switch")!.priority, 2);
});

test("multi-hit moves (Dual Chop, Gear Grind: exactly twice; Tail Slap: two to five times) carry their real hit counts", () => {
  assert.deepEqual(getMoveById("dual-chop")!.effect, { kind: "multi-hit", minHits: 2, maxHits: 2 });
  assert.deepEqual(getMoveById("gear-grind")!.effect, { kind: "multi-hit", minHits: 2, maxHits: 2 });
  assert.deepEqual(getMoveById("tail-slap")!.effect, { kind: "multi-hit", minHits: 2, maxHits: 5 });
});
