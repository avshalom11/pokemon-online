import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_4_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 4 (Sinnoh Moves & Learnsets Phase 3) introduced 113 official
// moves (National Dex move numbers #355-#467). Unlike Generation 3's Silver
// Wind case, none of them collide with an existing Generation 1-3 move id,
// so this file's own total is the full 113, not a reduced count.
const EXPECTED_GENERATION_4_MOVE_COUNT = 113;

test("exactly 113 Generation 4 moves are loaded", () => {
  assert.equal(GENERATION_4_MOVES.length, EXPECTED_GENERATION_4_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_4_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_4_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 4 and introducedGeneration 4", () => {
  assert.ok(GENERATION_4_MOVES.every((move) => move.generation === 4));
  assert.ok(GENERATION_4_MOVES.every((move) => move.introducedGeneration === 4));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_4_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 4 move appears in the real registry by id", () => {
  for (const move of GENERATION_4_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 4 set alongside Generation 1/2/3", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 4).length, GENERATION_4_MOVES.length);
});

test("no Generation 4 move id collides with an existing Generation 1/2/3 move id", () => {
  const gen4Ids = new Set(GENERATION_4_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 4).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen4Ids.has(id));
  assert.deepEqual(collisions, []);
});

// Spot checks against known canonical data, matching generation-1/2/3's own
// "sourced from Pokémon Showdown's move data" precedent.
test("spot check: Flare Blitz is a recoil move", () => {
  const move = getMoveById("flare-blitz")!;
  assert.equal(move.type, "fire");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 120);
  assert.deepEqual(move.effect, { kind: "recoil", recoilPercent: 33 });
});

test("spot check: Roost heals half the user's max HP", () => {
  const move = getMoveById("roost")!;
  assert.equal(move.category, "status");
  assert.equal(move.power, null);
  assert.deepEqual(move.effect, { kind: "heal", healPercent: 50 });
});

test("spot check: Giga Impact / Rock Wrecker / Roar of Time / Shadow Force are all charge-shaped (recharge or two-turn) signature-tier moves", () => {
  assert.equal(getMoveById("giga-impact")!.effect.kind, "charge");
  assert.equal(getMoveById("rock-wrecker")!.effect.kind, "charge");
  assert.equal(getMoveById("roar-of-time")!.effect.kind, "charge");
  assert.deepEqual(getMoveById("shadow-force")!.effect, { kind: "charge", invulnerable: true });
});

test("spot check: Drain Punch heals the user for half the damage dealt", () => {
  const move = getMoveById("drain-punch")!;
  assert.deepEqual(move.effect, { kind: "drain", drainPercent: 50 });
});

test("spot check: Grass Knot and Wring Out reuse the existing weight-based/current-HP-percent damage kinds", () => {
  assert.equal(getMoveById("grass-knot")!.effect.kind, "weight-based-damage");
  assert.equal(getMoveById("grass-knot")!.power, null);
  assert.deepEqual(getMoveById("wring-out")!.effect, { kind: "current-hp-percent-damage", percent: 50 });
});

test("spot check: unsupported-mechanic moves (Stealth Rock, Toxic Spikes, Trick Room, Tailwind) are registered but data-only no-op", () => {
  for (const id of ["stealth-rock", "toxic-spikes", "trick-room", "tailwind"]) {
    const move = getMoveById(id)!;
    assert.equal(move.effect.kind, "no-effect");
    assert.equal(move.power, null);
  }
});

test("priority moves carry their real priority value directly on the schema field, no special effect kind needed", () => {
  assert.equal(getMoveById("sucker-punch")!.priority, 1);
  assert.equal(getMoveById("feint")!.priority, 2);
  assert.equal(getMoveById("ice-shard")!.priority, 1);
  assert.equal(getMoveById("bullet-punch")!.priority, 1);
  assert.equal(getMoveById("aqua-jet")!.priority, 1);
  assert.equal(getMoveById("shadow-sneak")!.priority, 1);
  assert.equal(getMoveById("vacuum-wave")!.priority, 1);
  assert.equal(getMoveById("trick-room")!.priority, -7);
});
