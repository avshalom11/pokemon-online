// TM SYSTEM PHASE 3 focused coverage for the TM compatibility engine.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canLearnTm,
  getAllTmCompatibilityEntries,
  getCompatibleTmMoveIds,
  hasTmCompatibilityData,
  toTmMachineId,
  validateTmCompatibilityList,
  TmCompatibilityValidationError,
} from "./index.ts";

// TM CATALOG SWAP (Aerial Ace -> Fly) — 362 aerial-ace entries were removed
// and 116 fly entries were added (each backed by raw PokeAPI machine-learn
// -method data, see generation-*/index.ts's own doc comments), so the
// total pair count moved from 13361 to 13361 - 362 + 116 = 13115. Species
// count itself (1079) is unaffected — no entry was added or removed, only
// existing entries' own moveIds arrays changed.
test("the registry loads without throwing and reports the expected totals", () => {
  const entries = getAllTmCompatibilityEntries();
  assert.equal(entries.length, 1079);

  const totalPairs = entries.reduce((sum, entry) => sum + entry.moveIds.length, 0);
  assert.equal(totalPairs, 13115);
});

test("canLearnTm is true for a real, verified machine-compatibility fact", () => {
  assert.equal(canLearnTm("pikachu", "thunderbolt"), true);
  assert.equal(canLearnTm("bulbasaur", "solar-beam"), true);
  assert.equal(canLearnTm("charmander", "flamethrower"), true);
  assert.equal(canLearnTm("squirtle", "surf"), true);
});

test("DENY-BY-DEFAULT: an unknown pokemonId is always incompatible, never throws", () => {
  assert.equal(canLearnTm("not-a-real-pokemon", "thunderbolt"), false);
  assert.equal(hasTmCompatibilityData("not-a-real-pokemon"), false);
  assert.deepEqual(getCompatibleTmMoveIds("not-a-real-pokemon"), []);
});

test("DENY-BY-DEFAULT: a known pokemonId is incompatible with a move absent from its own list, even if the move exists and even if the type would 'make sense'", () => {
  // Bulbasaur (Grass/Poison) is never verified machine-compatible with
  // Flamethrower, and Pikachu (Electric) is never verified compatible with
  // Solar Beam — neither is remotely "logical" to reject by type, which is
  // exactly the point: this must stay false regardless.
  assert.equal(canLearnTm("bulbasaur", "flamethrower"), false);
  assert.equal(canLearnTm("pikachu", "solar-beam"), false);
});

test("species/forms are evaluated independently — an alternate form's compatibility never falls back to its base form's, or vice versa", () => {
  // Both are real, verified facts (Galarian Darmanitan is Ice-typed and
  // gains Ice-type TM compatibility its Kantonian base form never has).
  assert.equal(canLearnTm("darmanitan", "blizzard"), false);
  assert.equal(canLearnTm("darmanitan-galar", "blizzard"), true);
  // A base form is never compatible with something only its alternate form
  // is verified for, and vice versa is exercised above.
  assert.equal(canLearnTm("darmanitan-galar", "blizzard") !== canLearnTm("darmanitan", "blizzard"), true);
});

test("toTmMachineId always builds \"tm-<moveId>\", never a numeric TM slot", () => {
  assert.equal(toTmMachineId("thunderbolt"), "tm-thunderbolt");
  assert.equal(toTmMachineId("sludge-bomb"), "tm-sludge-bomb");
  assert.ok(!/\d/.test(toTmMachineId("thunderbolt")));
});

// TM CATALOG SWAP (Aerial Ace -> Fly)
test("Fly is a real, verified machine-compatibility fact for at least one species, sourced from raw PokeAPI data", () => {
  assert.equal(canLearnTm("charizard", "fly"), true);
  assert.equal(canLearnTm("pidgeot", "fly"), true);
});

test("no aerial-ace compatibility reference remains anywhere in the registry — it was retired as a TM, replaced by fly", () => {
  const entries = getAllTmCompatibilityEntries();
  for (const entry of entries) {
    assert.ok(!entry.moveIds.includes("aerial-ace"), `${entry.pokemonId} still references retired TM moveId "aerial-ace"`);
  }
  assert.equal(canLearnTm("charmander", "aerial-ace"), false, "aerial-ace must no longer resolve as a compatibility fact for any species");
});

test("DENY-BY-DEFAULT still holds for Fly: a species with no verified Fly compatibility fact stays incompatible, never inferred from Flying type or level-up learnset", () => {
  // Bulbasaur is not Flying-type and has no verified Fly compatibility
  // entry — must stay false regardless of any other fact about it.
  assert.equal(canLearnTm("bulbasaur", "fly"), false);
});

test("no duplicate pokemonId exists across the whole registry", () => {
  const entries = getAllTmCompatibilityEntries();
  const ids = entries.map((entry) => entry.pokemonId);
  assert.equal(new Set(ids).size, ids.length);
});

test("every entry has at least one moveId, and no entry has a duplicate moveId", () => {
  for (const entry of getAllTmCompatibilityEntries()) {
    assert.ok(entry.moveIds.length > 0, `${entry.pokemonId} has an empty moveIds list`);
    assert.equal(new Set(entry.moveIds).size, entry.moveIds.length, `${entry.pokemonId} has a duplicate moveId`);
  }
});

test("validateTmCompatibilityList rejects an unknown pokemonId", () => {
  assert.throws(() => validateTmCompatibilityList([{ pokemonId: "not-a-real-pokemon", moveIds: ["thunderbolt"] }]), TmCompatibilityValidationError);
});

test("validateTmCompatibilityList rejects an unknown moveId", () => {
  assert.throws(() => validateTmCompatibilityList([{ pokemonId: "pikachu", moveIds: ["not-a-real-move"] }]), TmCompatibilityValidationError);
});

test("validateTmCompatibilityList rejects a duplicate pokemonId across entries", () => {
  const entry = { pokemonId: "pikachu", moveIds: ["thunderbolt"] };
  assert.throws(() => validateTmCompatibilityList([entry, entry]), TmCompatibilityValidationError);
});

test("validateTmCompatibilityList rejects a duplicate moveId within one entry", () => {
  assert.throws(
    () => validateTmCompatibilityList([{ pokemonId: "pikachu", moveIds: ["thunderbolt", "thunderbolt"] }]),
    TmCompatibilityValidationError
  );
});
