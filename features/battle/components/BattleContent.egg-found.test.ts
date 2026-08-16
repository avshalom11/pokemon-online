// EGG DROP — CONFIRMATION DIALOG — regression guard: an egg drop reported
// in the battle victory response must open the blocking EggFoundDialog,
// resolved from the existing egg catalog (never a fabricated display name/
// image, never a battle-response shape change), without ever auto-
// incubating the egg or navigating to Hatchery. Also guards the egg-before-
// chest sequencing when a single victory drops both. BattleContent is a
// "use client"-tree component with no React Testing Library/jsdom set up in
// this project, so this checks the invariants via a static source read —
// same approach as this same directory's own BattleContent.chest-found.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSource = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");

test("applyVictoryReward opens the egg-found state from the real reward.egg data, only when dropped", () => {
  assert.ok(contentSource.includes("if (reward.egg.dropped)"), "must check the real dropped flag, never assume an egg always exists");
  assert.ok(contentSource.includes("setEggFound({"), "must set the egg-found state from the real reward data");
});

test("egg display name/image are resolved from the existing egg catalog via rarity, never a battle-response shape change", () => {
  assert.ok(contentSource.includes("import { getEggDefinition }"), "must reuse the existing egg catalog lookup");
  assert.ok(contentSource.includes("getEggDefinition(reward.egg.rarity)"), "must resolve off the real dropped rarity");
  assert.ok(contentSource.includes("rarityLabel: POKEMON_RARITY_LABELS[reward.egg.rarity]"), "must show the real rarity label");
});

test("the egg-found message is built via the shared eggFoundMessage helper, using the real defeated wild name and egg display name", () => {
  assert.ok(contentSource.includes('import { eggFoundMessage }'), "must import the existing shared message helper");
  assert.ok(contentSource.includes("eggFoundMessage(defeatedWildName, definition.displayName)"));
});

test("the egg dialog is only rendered while eggFound is set, and confirming it clears the state (never auto-incubates, never navigates to Hatchery)", () => {
  assert.ok(contentSource.includes("{eggFound ? ("), "the dialog must be conditionally rendered");
  assert.ok(contentSource.includes("onConfirm={() => setEggFound(null)}"), "confirming must only dismiss the dialog");
  assert.ok(!/eggFound[\s\S]{0,120}(startIncubation|router\.push\(.\/hatchery|hatchery)/i.test(contentSource), "must never auto-incubate or navigate to Hatchery from the battle screen");
});

test("a simultaneous egg+chest drop shows the egg dialog first — the chest dialog only renders once eggFound is cleared", () => {
  assert.ok(
    /\{eggFound \? \([\s\S]{0,400}\) : chestFound \? \(/.test(contentSource),
    "chestFound must render in the eggFound branch's else-if, never independently/simultaneously"
  );
});

test("both drops are applied independently — neither reward.egg nor reward.chest check can suppress the other", () => {
  assert.ok(contentSource.includes("if (reward.egg.dropped) {"));
  assert.ok(contentSource.includes("if (reward.chest.dropped) {"));
  // Both checks must exist as separate top-level ifs inside applyVictoryReward,
  // never an else-if chaining one drop's presence to the other's absence.
  assert.ok(!/reward\.egg\.dropped\)[\s\S]{0,200}else if \(reward\.chest\.dropped/.test(contentSource));
});
