import assert from "node:assert/strict";
import { test } from "node:test";

import { determineEvolutionStage, getHatchLevelRange, rollHatchLevel } from "./hatch-level.service.ts";

test("first-stage level range: base Pokémon that evolves at level 16 uses [10, 15]", () => {
  // charmander -> charmeleon @16 (data/pokemon/pokemon-evolutions.ts) — the
  // task's own worked example.
  assert.equal(determineEvolutionStage("charmander"), "first");
  assert.deepEqual(getHatchLevelRange("charmander"), { minimumLevel: 10, maximumLevel: 15 });
});

test("middle-stage level range: reached at 16, evolves at 36, uses [17, 35]", () => {
  // charmeleon: charmander -> charmeleon @16, charmeleon -> charizard @36 —
  // the task's own worked example.
  assert.equal(determineEvolutionStage("charmeleon"), "middle");
  assert.deepEqual(getHatchLevelRange("charmeleon"), { minimumLevel: 17, maximumLevel: 35 });
});

test("final-stage level range: reached at 36 with no further evolution uses [37, 45]", () => {
  assert.equal(determineEvolutionStage("charizard"), "final");
  assert.deepEqual(getHatchLevelRange("charizard"), { minimumLevel: 37, maximumLevel: 45 });
});

test("standalone (no evolution family at all) always uses [15, 45]", () => {
  // ditto has no entry in any evolution table, in either direction.
  assert.equal(determineEvolutionStage("ditto"), "standalone");
  assert.deepEqual(getHatchLevelRange("ditto"), { minimumLevel: 15, maximumLevel: 45 });
});

test("fallback: a first-stage species whose only evolution is item-based (no level threshold) uses [10, 25]", () => {
  // vulpix -> ninetales is Fire-Stone-only, no level anywhere.
  assert.equal(determineEvolutionStage("vulpix"), "first");
  assert.deepEqual(getHatchLevelRange("vulpix"), { minimumLevel: 10, maximumLevel: 25 });
});

test("fallback: a final-stage species reached only via an item (no clean predecessor level) uses [35, 45]", () => {
  assert.equal(determineEvolutionStage("ninetales"), "final");
  assert.deepEqual(getHatchLevelRange("ninetales"), { minimumLevel: 35, maximumLevel: 45 });
});

test("fallback: a first-stage species whose evolution is an ambiguous branch (Eevee) uses [10, 25]", () => {
  // eevee has no LEVEL_EVOLUTIONS entry of its own — only branch (Espeon/
  // Umbreon) and evolution-item (Flareon/Vaporeon/Jolteon/Leafeon/Glaceon/
  // Sylveon) targets, neither of which produces a single clean level.
  assert.equal(determineEvolutionStage("eevee"), "first");
  assert.deepEqual(getHatchLevelRange("eevee"), { minimumLevel: 10, maximumLevel: 25 });
});

test("fallback: a final-stage species reached only via a branch (Espeon) uses [35, 45]", () => {
  assert.equal(determineEvolutionStage("espeon"), "final");
  assert.deepEqual(getHatchLevelRange("espeon"), { minimumLevel: 35, maximumLevel: 45 });
});

test("fallback: a final-stage species whose real threshold is above 45 uses [35, 45], never [56, 45]", () => {
  // dragonair -> dragonite @55 — a clean level, but too high for the
  // normal rule to produce a valid range.
  assert.equal(determineEvolutionStage("dragonite"), "final");
  assert.deepEqual(getHatchLevelRange("dragonite"), { minimumLevel: 35, maximumLevel: 45 });
});

test("rollHatchLevel returns a level uniformly within the computed range, deterministic under an injected roll", () => {
  assert.equal(rollHatchLevel("charmander", () => 0), 10);
  assert.equal(rollHatchLevel("charmander", () => 0.999999), 15);
  assert.equal(rollHatchLevel("ditto", () => 0), 15);
  assert.equal(rollHatchLevel("ditto", () => 0.999999), 45);
});
