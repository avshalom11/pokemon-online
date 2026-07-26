import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getMovesByCategory,
  getMovesByFlag,
  getMovesByGeneration,
  getMovesByImplementationStatus,
  getMovesByType,
} from "./move-queries.ts";
import { SAMPLE_MOVES } from "../test-fixtures.ts";

test("getMovesByGeneration filters to the requested generation", () => {
  const results = getMovesByGeneration(1, SAMPLE_MOVES);
  assert.equal(results.length, SAMPLE_MOVES.length);
  assert.equal(getMovesByGeneration(2, SAMPLE_MOVES).length, 0);
});

test("getMovesByType filters to the requested type", () => {
  const results = getMovesByType("electric", SAMPLE_MOVES);
  assert.deepEqual(
    results.map((move) => move.id).sort(),
    ["thunder-wave", "thunderbolt"]
  );
});

test("getMovesByCategory filters to the requested category", () => {
  const statusMoves = getMovesByCategory("status", SAMPLE_MOVES);
  assert.ok(statusMoves.every((move) => move.category === "status"));
  assert.ok(statusMoves.length > 0);
});

test("getMovesByFlag filters to moves carrying that flag", () => {
  const soundBased = getMovesByFlag("soundBased", SAMPLE_MOVES);
  assert.deepEqual(soundBased.map((move) => move.id), ["growl"]);
});

test("getMovesByImplementationStatus filters to the requested status", () => {
  const futureMoves = getMovesByImplementationStatus("future", SAMPLE_MOVES);
  assert.equal(futureMoves.length, SAMPLE_MOVES.length);
  assert.equal(getMovesByImplementationStatus("implemented", SAMPLE_MOVES).length, 0);
});

test("query helpers default to the real Generation 1 registry when no list is passed", () => {
  const fireMoves = getMovesByType("fire");
  assert.ok(fireMoves.length > 0);
  assert.ok(fireMoves.every((move) => move.type === "fire"));
});
