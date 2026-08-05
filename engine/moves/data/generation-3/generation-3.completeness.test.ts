import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_3_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 3 (Hoenn Moves & Learnsets Phase 3) introduced 103 official
// moves (National Dex move numbers #252-#354). Silver Wind (#318) is
// deliberately excluded from this count — it already exists as a
// Generation 2 entry in this project's own catalog (engine/moves/data/
// generation-2/bug.moves.ts), and this database never defines the same
// move id twice — so this file's own total is 102, not 103.
const EXPECTED_GENERATION_3_MOVE_COUNT = 102;

test("exactly 102 Generation 3 moves are loaded (103 canonical minus Silver Wind, already Generation 2)", () => {
  assert.equal(GENERATION_3_MOVES.length, EXPECTED_GENERATION_3_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_3_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_3_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 3 and introducedGeneration 3", () => {
  assert.ok(GENERATION_3_MOVES.every((move) => move.generation === 3));
  assert.ok(GENERATION_3_MOVES.every((move) => move.introducedGeneration === 3));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_3_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 3 move appears in the real registry by id", () => {
  for (const move of GENERATION_3_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 3 set alongside Generation 1/2", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 3).length, GENERATION_3_MOVES.length);
});

test("no Generation 3 move id collides with an existing Generation 1/2 move id", () => {
  const gen3Ids = new Set(GENERATION_3_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 3).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen3Ids.has(id));
  assert.deepEqual(collisions, []);
});

// Spot checks against known canonical data, matching generation-1's own
// "sourced from Pokémon Showdown's move data" precedent.
test("spot check: Dragon Claw", () => {
  const move = getMoveById("dragon-claw")!;
  assert.equal(move.type, "dragon");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 80);
  assert.equal(move.accuracy, 100);
});

test("spot check: Calm Mind", () => {
  const move = getMoveById("calm-mind")!;
  assert.equal(move.category, "status");
  assert.equal(move.power, null);
  assert.deepEqual(move.effect, {
    kind: "stat-change",
    changes: [{ stat: "specialAttack", stages: 1 }, { stat: "specialDefense", stages: 1 }],
  });
});

test("spot check: Frenzy Plant / Blast Burn / Hydro Cannon are all charge-shaped (recharge-turn) special/physical starters' signature moves", () => {
  assert.equal(getMoveById("frenzy-plant")!.effect.kind, "charge");
  assert.equal(getMoveById("blast-burn")!.effect.kind, "charge");
  assert.equal(getMoveById("hydro-cannon")!.effect.kind, "charge");
});

test("spot check: Sheer Cold is an OHKO move", () => {
  const move = getMoveById("sheer-cold")!;
  assert.equal(move.effect.kind, "ohko");
  assert.equal(move.power, null);
});

test("spot check: Silver Wind is not redefined — it resolves to the pre-existing Generation 2 entry", () => {
  const move = getMoveById("silver-wind")!;
  assert.equal(move.generation, 2);
});
