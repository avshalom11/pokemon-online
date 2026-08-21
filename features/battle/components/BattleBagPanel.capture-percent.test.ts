// Field Battle Bag — live capture-chance display, UI-wiring regression
// guard. BattleBagPanel/BattleContent are "use client" components with no
// React Testing Library/jsdom set up in this project (same limitation
// BattleContent.rarity-display.test.ts's own doc comment notes), so this
// checks the wiring via a static source read instead of rendering. The
// actual percent math is covered by lib/battle/ballCaptureDisplay.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const bagPanelSource = readFileSync(new URL("./BattleBagPanel.tsx", import.meta.url), "utf8");
const battleContentSource = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");

test("BattleBagPanel computes every displayed percent via the shared getBallCapturePercent helper, never inline math", () => {
  assert.ok(
    bagPanelSource.includes('import { getBallCapturePercent } from "@/lib/battle/ballCaptureDisplay";'),
    "must import the shared display helper"
  );
  assert.ok(
    bagPanelSource.includes("getBallCapturePercent(view.item.id, wildCaptureState)"),
    "the percent shown per ball must come from getBallCapturePercent(itemId, wildCaptureState)"
  );
  // No competing formula: this file must never itself multiply/round a
  // probability or read CAPTURE_RATE_TABLE directly.
  assert.ok(!bagPanelSource.includes("CAPTURE_RATE_TABLE"), "BattleBagPanel must not read the capture table directly");
  assert.ok(!bagPanelSource.includes("Math.round("), "BattleBagPanel must not compute/round a percent itself");
});

test("the percent badge only ever renders on the Poké Balls tab, never for Medicine items", () => {
  assert.ok(
    bagPanelSource.includes('capturePercent={category === "poke-balls" ? getBallCapturePercent(view.item.id, wildCaptureState) : null}'),
    "capturePercent must be gated on category === \"poke-balls\""
  );
});

test("BattleContent feeds the Bag the real, live wild HP and real species rarity — never a hardcoded or stale value", () => {
  assert.ok(
    battleContentSource.includes("currentHp: wildState.currentHealth,") &&
      battleContentSource.includes("maxHp: wildState.maximumHealth,") &&
      battleContentSource.includes("rarity: wildState.pokemon.rarity,"),
    "wildCaptureState must be built from wildState's own live currentHealth/maximumHealth/pokemon.rarity fields"
  );
});

test("BattleContent never passes gym/league-only or fabricated capture inputs to the Bag", () => {
  assert.ok(!/wildCaptureState=\{\{\s*currentHp:\s*\d/.test(battleContentSource), "currentHp must never be a literal number");
  assert.ok(!/wildCaptureState=\{\{[\s\S]{0,120}rarity:\s*"/.test(battleContentSource), "rarity must never be a literal string");
});

test("Gym battles do not use BattleBagPanel (Field Battle capture UI stays scoped to the wild encounter flow)", () => {
  const gymBagPanelSource = readFileSync(new URL("../../gyms/components/GymBagPanel.tsx", import.meta.url), "utf8");
  assert.ok(!gymBagPanelSource.includes("getBallCapturePercent"), "GymBagPanel must remain untouched by this feature");
});
