import assert from "node:assert/strict";
import { test } from "node:test";

import { canApplyStatus, isImmuneToStatus } from "./major-status.ts";

test("a fire-type Pokémon cannot be burned (representative type immunity)", () => {
  assert.equal(isImmuneToStatus(["fire"], "burn"), true);
  assert.equal(isImmuneToStatus(["water"], "burn"), false);
});

test("electric/ice/poison(+steel) immunities all hold", () => {
  assert.equal(isImmuneToStatus(["electric"], "paralysis"), true);
  assert.equal(isImmuneToStatus(["ice"], "freeze"), true);
  assert.equal(isImmuneToStatus(["poison"], "poison"), true);
  assert.equal(isImmuneToStatus(["steel"], "poison"), true);
  assert.equal(isImmuneToStatus(["normal"], "paralysis"), false);
});

test("an already-statused target rejects a new major status", () => {
  const result = canApplyStatus("paralysis", "burn", ["water"]);
  assert.deepEqual(result, { applied: false, reason: "already-statused" });
});

test("an immune target rejects the status even with no current status", () => {
  const result = canApplyStatus(null, "burn", ["fire"]);
  assert.deepEqual(result, { applied: false, reason: "immune" });
});

test("a non-immune, status-free target accepts the status", () => {
  assert.deepEqual(canApplyStatus(null, "paralysis", ["water"]), { applied: true });
});
