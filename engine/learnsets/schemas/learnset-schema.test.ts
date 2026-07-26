import assert from "node:assert/strict";
import { test } from "node:test";

import { pokemonLearnsetSchema, learningMethodSchema } from "./learnset-schema.ts";
import { BULBASAUR_LEARNSET, CHARMANDER_LEARNSET, SAMPLE_LEARNSETS } from "../test-fixtures.ts";

test("a well-formed learnset passes validation", () => {
  assert.equal(pokemonLearnsetSchema.safeParse(BULBASAUR_LEARNSET).success, true);
});

test("every sample fixture learnset passes validation", () => {
  for (const learnset of SAMPLE_LEARNSETS) {
    const result = pokemonLearnsetSchema.safeParse(learnset);
    assert.equal(result.success, true, `expected "${learnset.pokemonId}" to be valid: ${result.success ? "" : JSON.stringify(result.error.issues)}`);
  }
});

// --- every learning-method variant ---

test("accepts a level-up method", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "level-up", level: 1 }).success, true);
});

test("accepts a machine method (tm)", () => {
  assert.equal(
    learningMethodSchema.safeParse({ kind: "machine", machineType: "tm", machineId: "tm24" }).success,
    true
  );
});

test("accepts a machine method (hm)", () => {
  assert.equal(
    learningMethodSchema.safeParse({ kind: "machine", machineType: "hm", machineId: "hm03" }).success,
    true
  );
});

test("accepts a tutor method", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "tutor" }).success, true);
});

test("accepts an egg method", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "egg" }).success, true);
});

test("accepts a special method", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "special" }).success, true);
});

test("rejects an unrecognized method kind", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "trade" }).success, false);
});

// --- invalid level values ---

test("rejects level-up level: 0 (level 1 is the minimum, never 0)", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "level-up", level: 0 }).success, false);
});

test("rejects a negative level-up level", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "level-up", level: -5 }).success, false);
});

test("rejects a non-integer level-up level", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "level-up", level: 5.5 }).success, false);
});

test("rejects a level-up entry missing `level`", () => {
  assert.equal(learningMethodSchema.safeParse({ kind: "level-up" }).success, false);
});

// --- invalid machine IDs ---

test("rejects a machineId that doesn't match the tm/hm + digits shape", () => {
  assert.equal(
    learningMethodSchema.safeParse({ kind: "machine", machineType: "tm", machineId: "move24" }).success,
    false
  );
});

test("rejects a machineId whose prefix doesn't match machineType", () => {
  const result = learningMethodSchema.safeParse({ kind: "machine", machineType: "tm", machineId: "hm03" });
  assert.equal(result.success, false);
});

test("rejects an invalid machineType", () => {
  assert.equal(
    learningMethodSchema.safeParse({ kind: "machine", machineType: "cd", machineId: "cd01" }).success,
    false
  );
});

// --- duplicate / contradictory entries within one learnset ---

test("rejects a learnset with an exact duplicate entry", () => {
  const withDuplicate = {
    ...BULBASAUR_LEARNSET,
    entries: [...BULBASAUR_LEARNSET.entries, { ...BULBASAUR_LEARNSET.entries[0] }],
  };
  assert.equal(pokemonLearnsetSchema.safeParse(withDuplicate).success, false);
});

test("rejects a learnset where the same move is a level-up move at two different levels in the same (unscoped) version", () => {
  const contradictory = {
    pokemonId: "bulbasaur",
    generation: 1,
    entries: [
      { moveId: "tackle", method: { kind: "level-up" as const, level: 1 } },
      { moveId: "tackle", method: { kind: "level-up" as const, level: 5 } },
    ],
  };
  assert.equal(pokemonLearnsetSchema.safeParse(contradictory).success, false);
});

test("allows the same move at two different levels when they belong to different version groups", () => {
  assert.equal(pokemonLearnsetSchema.safeParse(CHARMANDER_LEARNSET).success, true);
});

// --- other required-field / shape checks ---

test("rejects a learnset with an empty entries list", () => {
  assert.equal(
    pokemonLearnsetSchema.safeParse({ pokemonId: "bulbasaur", generation: 1, entries: [] }).success,
    false
  );
});

test("rejects an empty or malformed pokemonId", () => {
  assert.equal(
    pokemonLearnsetSchema.safeParse({ ...BULBASAUR_LEARNSET, pokemonId: "" }).success,
    false
  );
  assert.equal(
    pokemonLearnsetSchema.safeParse({ ...BULBASAUR_LEARNSET, pokemonId: "Bulbasaur" }).success,
    false
  );
});

test("rejects an invalid generation value", () => {
  assert.equal(pokemonLearnsetSchema.safeParse({ ...BULBASAUR_LEARNSET, generation: 0 }).success, false);
  assert.equal(pokemonLearnsetSchema.safeParse({ ...BULBASAUR_LEARNSET, generation: 1.5 }).success, false);
});

test("rejects a learnset missing a required field", () => {
  const withoutGeneration: Record<string, unknown> = { ...BULBASAUR_LEARNSET };
  delete withoutGeneration.generation;
  assert.equal(pokemonLearnsetSchema.safeParse(withoutGeneration).success, false);
});

test("rejects an entry with a malformed moveId", () => {
  const malformed = {
    ...BULBASAUR_LEARNSET,
    entries: [{ moveId: "Tackle Attack!", method: { kind: "level-up" as const, level: 1 } }],
  };
  assert.equal(pokemonLearnsetSchema.safeParse(malformed).success, false);
});

test("rejects a malformed versionGroup", () => {
  const malformed = {
    ...BULBASAUR_LEARNSET,
    entries: [{ moveId: "tackle", method: { kind: "level-up" as const, level: 1 }, versionGroup: "Red Blue!" }],
  };
  assert.equal(pokemonLearnsetSchema.safeParse(malformed).success, false);
});
