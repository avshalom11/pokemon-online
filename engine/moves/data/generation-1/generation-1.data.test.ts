import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_1_MOVES } from "./index.ts";
import { GENERATION_1_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_1_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_1_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_1_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_1_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_1_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_1_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_1_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_1_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_1_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_1_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_1_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_1_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_1_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_1_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_1_DARK_MOVES } from "./dark.moves.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";
import {
  getMovesByGeneration,
  getMovesByType,
  getMovesByCategory,
} from "../../queries/move-queries.ts";

const TYPE_FILES: Array<[string, typeof GENERATION_1_NORMAL_MOVES]> = [
  ["normal", GENERATION_1_NORMAL_MOVES],
  ["fire", GENERATION_1_FIRE_MOVES],
  ["water", GENERATION_1_WATER_MOVES],
  ["electric", GENERATION_1_ELECTRIC_MOVES],
  ["grass", GENERATION_1_GRASS_MOVES],
  ["ice", GENERATION_1_ICE_MOVES],
  ["fighting", GENERATION_1_FIGHTING_MOVES],
  ["poison", GENERATION_1_POISON_MOVES],
  ["ground", GENERATION_1_GROUND_MOVES],
  ["flying", GENERATION_1_FLYING_MOVES],
  ["psychic", GENERATION_1_PSYCHIC_MOVES],
  ["bug", GENERATION_1_BUG_MOVES],
  ["rock", GENERATION_1_ROCK_MOVES],
  ["ghost", GENERATION_1_GHOST_MOVES],
  ["dragon", GENERATION_1_DRAGON_MOVES],
  ["dark", GENERATION_1_DARK_MOVES],
];

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_1_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move belongs to exactly one type file, matching its own `type` field", () => {
  for (const [fileType, moves] of TYPE_FILES) {
    for (const move of moves) {
      assert.equal(move.type, fileType, `${move.id} is declared in ${fileType}.moves.ts but has type "${move.type}"`);
    }
  }

  const totalAcrossFiles = TYPE_FILES.reduce((sum, [, moves]) => sum + moves.length, 0);
  assert.equal(totalAcrossFiles, GENERATION_1_MOVES.length);

  // no move id appears in more than one type file
  const seenIn = new Map<string, string>();
  for (const [fileType, moves] of TYPE_FILES) {
    for (const move of moves) {
      const existing = seenIn.get(move.id);
      assert.equal(existing, undefined, `${move.id} appears in both ${existing} and ${fileType}`);
      seenIn.set(move.id, fileType);
    }
  }
});

test("every move has generation 1", () => {
  assert.ok(GENERATION_1_MOVES.every((move) => move.generation === 1));
});

test("every move has introducedGeneration 1", () => {
  assert.ok(GENERATION_1_MOVES.every((move) => move.introducedGeneration === 1));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_1_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 1 move appears in the registry by id", () => {
  for (const move of GENERATION_1_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 1 set", () => {
  // The real registry is every generation's moves combined (see
  // engine/moves/data/index.ts) — Generation 2 exists alongside Generation 1
  // as of Phase 3, so this only asserts the Generation-1-tagged subset of
  // the real registry matches this file's own GENERATION_1_MOVES array,
  // never a raw getAllMoves().length equality.
  assert.equal(getAllMoves().filter((move) => move.generation === 1).length, GENERATION_1_MOVES.length);
});

test("getMovesByGeneration(1) returns every move", () => {
  assert.equal(getMovesByGeneration(1).length, 165);
});

test("getMovesByType returns only moves of that type, and totals 165 across all types", () => {
  // Explicitly scoped to GENERATION_1_MOVES (never getMovesByType's own
  // default of the real, now-multi-generation getAllMoves() registry) —
  // Generation 2 (Phase 3) reuses several of these same type names, so the
  // default global scope would otherwise pull in Generation 2 moves too and
  // inflate this count past 165.
  let total = 0;
  for (const [fileType] of TYPE_FILES) {
    const results = getMovesByType(fileType as never, GENERATION_1_MOVES);
    assert.ok(results.every((move) => move.type === fileType));
    total += results.length;
  }
  assert.equal(total, 165);
});

test("getMovesByCategory partitions all 165 moves across physical/special/status with no overlap", () => {
  // Same explicit-scope reasoning as getMovesByType above — the real
  // registry now spans Generation 1 and Generation 2.
  const physical = getMovesByCategory("physical", GENERATION_1_MOVES);
  const special = getMovesByCategory("special", GENERATION_1_MOVES);
  const status = getMovesByCategory("status", GENERATION_1_MOVES);
  assert.equal(physical.length + special.length + status.length, 165);
});

// Spot checks against known canonical (current-generation) data, sourced
// from Pokémon Showdown's move data (this database's primary reference).
test("spot check: Tackle", () => {
  const move = getMoveById("tackle")!;
  assert.equal(move.name, "Tackle");
  assert.equal(move.type, "normal");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 40);
  assert.equal(move.accuracy, 100);
  assert.equal(move.maxPp, 35);
  assert.equal(move.effect.kind, "damage");
});

test("spot check: Quick Attack", () => {
  const move = getMoveById("quick-attack")!;
  assert.equal(move.type, "normal");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 40);
  assert.equal(move.priority, 1);
});

test("spot check: Thunderbolt", () => {
  const move = getMoveById("thunderbolt")!;
  assert.equal(move.type, "electric");
  assert.equal(move.category, "special");
  assert.equal(move.power, 90);
  assert.equal(move.accuracy, 100);
  assert.equal(move.maxPp, 15);
  assert.deepEqual(move.effect, { kind: "damage-with-status-chance", status: "paralysis", chancePercent: 10 });
});

test("spot check: Flamethrower", () => {
  const move = getMoveById("flamethrower")!;
  assert.equal(move.type, "fire");
  assert.equal(move.category, "special");
  assert.equal(move.power, 90);
  assert.equal(move.accuracy, 100);
});

test("spot check: Surf", () => {
  const move = getMoveById("surf")!;
  assert.equal(move.type, "water");
  assert.equal(move.category, "special");
  assert.equal(move.power, 90);
  assert.equal(move.accuracy, 100);
  assert.equal(move.target, "all-pokemon");
});

test("spot check: Ice Beam", () => {
  const move = getMoveById("ice-beam")!;
  assert.equal(move.type, "ice");
  assert.equal(move.category, "special");
  assert.equal(move.power, 90);
  assert.equal(move.accuracy, 100);
});

test("spot check: Psychic", () => {
  const move = getMoveById("psychic")!;
  assert.equal(move.type, "psychic");
  assert.equal(move.category, "special");
  assert.equal(move.power, 90);
  assert.equal(move.effect.kind, "damage-with-stat-change-chance");
});

test("spot check: Earthquake", () => {
  const move = getMoveById("earthquake")!;
  assert.equal(move.type, "ground");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 100);
  assert.equal(move.accuracy, 100);
});

test("spot check: Recover", () => {
  const move = getMoveById("recover")!;
  assert.equal(move.category, "status");
  assert.equal(move.power, null);
  assert.deepEqual(move.effect, { kind: "heal", healPercent: 50 });
});

test("spot check: Rest", () => {
  const move = getMoveById("rest")!;
  assert.equal(move.category, "status");
  assert.equal(move.power, null);
  assert.equal(move.effect.kind, "heal");
});

test("spot check: Explosion", () => {
  const move = getMoveById("explosion")!;
  assert.equal(move.type, "normal");
  assert.equal(move.category, "physical");
  assert.equal(move.power, 250);
});

test("spot check: Hyper Beam", () => {
  const move = getMoveById("hyper-beam")!;
  assert.equal(move.type, "normal");
  assert.equal(move.category, "special");
  assert.equal(move.power, 150);
  assert.equal(move.accuracy, 90);
  assert.equal(move.maxPp, 5);
});
