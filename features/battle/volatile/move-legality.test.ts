import assert from "node:assert/strict";
import { test } from "node:test";

import { getUsableMoveIds } from "./move-legality";

test("Disable excludes one move; Encore restricts selection to only its forced move", () => {
  assert.deepEqual(
    getUsableMoveIds(["tackle", "growl", "scratch"], { disable: { moveId: "growl", turnsRemaining: 2 } }),
    ["tackle", "scratch"]
  );
  assert.deepEqual(
    getUsableMoveIds(["tackle", "growl", "scratch"], { encore: { moveId: "scratch", turnsRemaining: 2 } }),
    ["scratch"]
  );
});

test("Disable+Encore on the same move never produces an impossible (empty) list, and a fully-disabled single move falls back to itself", () => {
  assert.deepEqual(
    getUsableMoveIds(["tackle", "scratch"], {
      disable: { moveId: "scratch", turnsRemaining: 2 },
      encore: { moveId: "scratch", turnsRemaining: 2 },
    }),
    ["tackle"]
  );
  assert.deepEqual(getUsableMoveIds(["tackle"], { disable: { moveId: "tackle", turnsRemaining: 2 } }), ["tackle"]);
});
