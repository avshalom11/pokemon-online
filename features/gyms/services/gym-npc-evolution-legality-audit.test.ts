import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEvolutionStageLegality } from "./gym-npc-evolution-legality-audit.ts";

test("no conflict is reported when the Gym range overlaps the species' legal range", () => {
  // Bulbasaur's own legal range is capped by its evolution into Ivysaur
  // (maximumLevel = evolution level - 1) — a difficulty range that falls
  // entirely within that window overlaps cleanly.
  const result = checkEvolutionStageLegality("bulbasaur", 10, "easy");
  assert.equal(result, null);
});

test("a conflict is reported (not silently ignored) when a fixed species' evolution-legal minimum exceeds the Gym's difficulty range for a low player level", () => {
  // Venusaur legally requires having evolved (min level far above 1);
  // a level-1 player's Easy Trainer range is clamped to {1,1} — no overlap.
  const conflict = checkEvolutionStageLegality("venusaur", 1, "easy");
  assert.ok(conflict, "expected a detected conflict, not null");
  assert.equal(conflict!.speciesId, "venusaur");
  assert.equal(conflict!.gymRange.minLevel, 1);
  assert.equal(conflict!.gymRange.maxLevel, 1);
  assert.ok(conflict!.speciesLegalRange.minimumLevel > 1);
});

test("detection never mutates or decides anything — it only reports the two ranges that failed to overlap", () => {
  const conflict = checkEvolutionStageLegality("venusaur", 1, "hard");
  assert.ok(conflict);
  assert.equal(typeof conflict!.speciesLegalRange.minimumLevel, "number");
  assert.equal(typeof conflict!.gymRange.minLevel, "number");
});
