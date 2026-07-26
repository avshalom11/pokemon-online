import assert from "node:assert/strict";
import { test } from "node:test";

import { moveSchema } from "./move-schema.ts";
import { SAMPLE_MOVES } from "../test-fixtures.ts";

const VALID_MOVE = SAMPLE_MOVES.find((move) => move.id === "thunderbolt")!;

test("a well-formed move passes validation", () => {
  const result = moveSchema.safeParse(VALID_MOVE);
  assert.equal(result.success, true);
});

test("every sample fixture move passes validation", () => {
  for (const move of SAMPLE_MOVES) {
    const result = moveSchema.safeParse(move);
    assert.equal(result.success, true, `expected "${move.id}" to be valid: ${result.success ? "" : JSON.stringify(result.error.issues)}`);
  }
});

test("rejects a display name used where the id belongs (spaces, capitals)", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, id: "Thunderbolt" });
  assert.equal(result.success, false);
});

test("rejects power: 0 (must be a positive integer, never 0)", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, power: 0 });
  assert.equal(result.success, false);
});

test("rejects a non-integer power", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, power: 12.5 });
  assert.equal(result.success, false);
});

test("rejects accuracy: 0 (moves that never miss must use null, never 0)", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, accuracy: 0 });
  assert.equal(result.success, false);
});

test("rejects accuracy above 100", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, accuracy: 101 });
  assert.equal(result.success, false);
});

test("accepts accuracy: null for a move with no accuracy check", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, accuracy: null });
  assert.equal(result.success, true);
});

test("rejects a non-integer priority", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, priority: 1.5 });
  assert.equal(result.success, false);
});

test("rejects an invalid category", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, category: "ultra" });
  assert.equal(result.success, false);
});

test("rejects an invalid type", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, type: "cosmic" });
  assert.equal(result.success, false);
});

test("rejects an invalid target", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, target: "everyone" });
  assert.equal(result.success, false);
});

test("rejects an invalid implementationStatus", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, implementationStatus: "wip" });
  assert.equal(result.success, false);
});

test("rejects a status-category move with a non-null power", () => {
  const growl = SAMPLE_MOVES.find((move) => move.id === "growl")!;
  const result = moveSchema.safeParse({ ...growl, power: 40 });
  assert.equal(result.success, false);
});

test("rejects a power-based effect (damage) paired with power: null", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, power: null });
  assert.equal(result.success, false);
});

test("rejects a powerless effect (fixed-damage) paired with a non-null power", () => {
  const seismicToss = SAMPLE_MOVES.find((move) => move.id === "seismic-toss")!;
  const result = moveSchema.safeParse({ ...seismicToss, power: 50 });
  assert.equal(result.success, false);
});

test("rejects an unrecognized move flag", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, flags: ["explodes"] });
  assert.equal(result.success, false);
});

test("rejects a move missing a required field", () => {
  const withoutDescription: Record<string, unknown> = { ...VALID_MOVE };
  delete withoutDescription.description;
  const result = moveSchema.safeParse(withoutDescription);
  assert.equal(result.success, false);
});

test("rejects an invalid effect definition (multi-hit maxHits below minHits)", () => {
  const furyAttack = SAMPLE_MOVES.find((move) => move.id === "fury-attack")!;
  const result = moveSchema.safeParse({
    ...furyAttack,
    effect: { kind: "multi-hit", minHits: 5, maxHits: 2 },
  });
  assert.equal(result.success, false);
});

test("rejects an invalid effect definition (unknown effect kind)", () => {
  const result = moveSchema.safeParse({ ...VALID_MOVE, effect: { kind: "explode" } });
  assert.equal(result.success, false);
});

test("rejects a stat-change effect with a 0-stage change", () => {
  const growl = SAMPLE_MOVES.find((move) => move.id === "growl")!;
  const result = moveSchema.safeParse({
    ...growl,
    effect: { kind: "stat-change", changes: [{ stat: "attack", stages: 0 }] },
  });
  assert.equal(result.success, false);
});
