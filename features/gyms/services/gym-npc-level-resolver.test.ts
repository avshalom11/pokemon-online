import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveNpcTeamLevels } from "./gym-npc-level-resolver.ts";

test("uses Phase 1 Gym scaling: Easy resolves within playerLevel -4..-1", () => {
  const resolved = resolveNpcTeamLevels(20, "easy", ["a", "b"], () => 0);
  assert.deepEqual(
    resolved.map((r) => r.level),
    [16, 16]
  );
  const resolvedMax = resolveNpcTeamLevels(20, "easy", ["a"], () => 0.999999);
  assert.equal(resolvedMax[0].level, 19);
});

test("minimum resolved level is always 1", () => {
  const resolved = resolveNpcTeamLevels(2, "easy", ["a"], () => 0);
  // player level 2, easy offsets -4..-1 -> clamped range {1,1}.
  assert.equal(resolved[0].level, 1);
});

test("each Pokémon may receive an independently resolved level within the same range", () => {
  const rolls = [0, 0.5, 0.999];
  let i = 0;
  const randomSource = () => rolls[i++];
  const resolved = resolveNpcTeamLevels(20, "hard", ["a", "b", "c"], randomSource);
  // hard: playerLevel +2..+5 -> range 22..25 (span 4).
  assert.deepEqual(
    resolved.map((r) => r.level),
    [22, 24, 25]
  );
});

test("deterministic random injection: the same randomSource sequence always produces the same result", () => {
  const fixedSource = () => 0.5;
  const first = resolveNpcTeamLevels(30, "very-hard", ["a", "b"], fixedSource);
  const second = resolveNpcTeamLevels(30, "very-hard", ["a", "b"], fixedSource);
  assert.deepEqual(first, second);
});

test("species/team is preserved unchanged in the resolved output — only levels are added", () => {
  const resolved = resolveNpcTeamLevels(10, "medium", ["pikachu", "charizard"], () => 0);
  assert.deepEqual(
    resolved.map((r) => r.speciesId),
    ["pikachu", "charizard"]
  );
});
