// Phase 4F regression guard: BattleContent must never regain direct
// battle-math access. This is a static source check rather than a runtime
// one on purpose — BattleContent is a "use client" React component with no
// practical way to unit-test its internals directly in this project's
// Node-based test setup (no React Testing Library / jsdom is installed
// here), and the property under test ("this file contains no damage
// calculation") is itself a static fact about the file's imports/contents,
// not a behavior.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");

test("BattleContent no longer imports the fixed-damage function directly", () => {
  assert.ok(
    !source.includes("applyFixedAttack"),
    "BattleContent must resolve attacks through the Battle Action Service (executeBattleActionAction), not by calling applyFixedAttack itself"
  );
});

test("BattleContent no longer imports from engine/battle/battle-config", () => {
  assert.ok(
    !source.includes("@/engine/battle/battle-config"),
    "battle-config (the fixed-damage implementation) belongs behind the Battle Action Service now, not inside the React component"
  );
});

test("BattleContent calls the Battle Action Service's Server Action for its attack handler", () => {
  assert.ok(
    source.includes("executeBattleActionAction"),
    "handleAttack must delegate to features/battle/actions/battle-action.action.ts"
  );
});
