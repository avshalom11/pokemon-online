// Phase 5A regression tests for buildAttackSlots — pure, no Prisma, no
// React (see this file's sibling battle-attack-slots.ts for why it's split
// out of BattleContent). Covers the UI-slot-building side of "a Pokémon
// may know 1-4 moves, always render four slots, unknown slots disabled,
// never reorder."
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAttackSlots, KNOWN_MOVE_SLOT_COUNT } from "./battle-attack-slots.ts";
import type { BattleKnownMoveSlot } from "../services/battle-view.service.ts";

function move(overrides: Partial<BattleKnownMoveSlot> & Pick<BattleKnownMoveSlot, "slot" | "moveId">): BattleKnownMoveSlot {
  return {
    name: overrides.moveId,
    type: "normal",
    category: "physical",
    power: 40,
    accuracy: 100,
    ...overrides,
  };
}

test("a Pokémon with one known move renders four slots, only the first enabled", () => {
  const slots = buildAttackSlots([move({ slot: 1, moveId: "tackle" })]);

  assert.equal(slots.length, KNOWN_MOVE_SLOT_COUNT);
  assert.equal(slots[0].id, "tackle");
  assert.equal(slots[0].disabled, undefined);
  assert.equal(slots[1].disabled, true);
  assert.equal(slots[2].disabled, true);
  assert.equal(slots[3].disabled, true);
});

test("a Pokémon with two known moves renders four slots, the first two enabled", () => {
  const slots = buildAttackSlots([move({ slot: 1, moveId: "tackle" }), move({ slot: 2, moveId: "growl" })]);

  assert.equal(slots[0].id, "tackle");
  assert.equal(slots[1].id, "growl");
  assert.ok(!slots[0].disabled);
  assert.ok(!slots[1].disabled);
  assert.equal(slots[2].disabled, true);
  assert.equal(slots[3].disabled, true);
});

test("a Pokémon with four known moves renders four fully enabled slots", () => {
  const slots = buildAttackSlots([
    move({ slot: 1, moveId: "tackle" }),
    move({ slot: 2, moveId: "growl" }),
    move({ slot: 3, moveId: "ember" }),
    move({ slot: 4, moveId: "smokescreen" }),
  ]);

  assert.equal(slots.length, 4);
  assert.deepEqual(
    slots.map((slot) => slot.id),
    ["tackle", "growl", "ember", "smokescreen"]
  );
  assert.ok(slots.every((slot) => !slot.disabled));
});

test("empty slots are disabled and carry no move metadata", () => {
  const slots = buildAttackSlots([move({ slot: 1, moveId: "tackle" })]);

  const empty = slots[1];
  assert.equal(empty.disabled, true);
  assert.equal(empty.type, undefined);
  assert.equal(empty.category, undefined);
  assert.equal(empty.power, undefined);
  assert.equal(empty.accuracy, undefined);
});

test("slot order is always preserved, regardless of input array order", () => {
  const slots = buildAttackSlots([
    move({ slot: 3, moveId: "ember" }),
    move({ slot: 1, moveId: "tackle" }),
    move({ slot: 2, moveId: "growl" }),
  ]);

  assert.deepEqual(
    slots.map((slot) => slot.id),
    ["tackle", "growl", "ember", `empty-slot-4`]
  );
});

test("each enabled slot exposes name, type, category, power, and accuracy read from the resolved move", () => {
  const slots = buildAttackSlots([
    move({ slot: 1, moveId: "ember", name: "Ember", type: "fire", category: "special", power: 40, accuracy: 100 }),
  ]);

  assert.deepEqual(slots[0], {
    id: "ember",
    name: "Ember",
    type: "fire",
    category: "special",
    power: 40,
    accuracy: 100,
  });
});
