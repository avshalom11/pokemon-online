// STATUS-HEALING ITEMS — behavioral coverage for applyMedicineItemUse's new
// "cure-status" branch, against the fake Prisma DB, same "real service, fake
// DB" shape this codebase's other behavioral tests already use. Deliberately
// its own file (use-medicine.service.status.test.ts) rather than merged into
// a pre-existing use-medicine test file — none existed before this feature
// (see this feature's own audit report).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { applyMedicineItemUse } from "@/features/battle/services/use-medicine.service";
import {
  getInventoryItemRow,
  getPlayerPokemonRow,
  resetFakeDb,
  seedInventoryItem,
  seedPlayerPokemon,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("Antidote cures poison: status and statusTurnsRemaining both cleared, exactly one item consumed", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "poison", statusTurnsRemaining: null });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 3 });

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.curedStatus, "poison");
  assert.equal(result.remainingQuantity, 2);

  const pokemon = getPlayerPokemonRow("mon1")!;
  assert.equal(pokemon.status, null);
  assert.equal(pokemon.statusTurnsRemaining, null);
  assert.equal(getInventoryItemRow("p1", "antidote")?.quantity, 2);
});

test("Burn Heal cures burn", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "burn" });
  seedInventoryItem({ playerId: "p1", itemId: "burn-heal", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "burn-heal", "mon1");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon1")!.status, null);
});

test("Paralyze Heal cures paralysis", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "paralysis" });
  seedInventoryItem({ playerId: "p1", itemId: "paralyze-heal", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "paralyze-heal", "mon1");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon1")!.status, null);
});

test("Awakening cures sleep AND clears statusTurnsRemaining — the exact case this task's own spec calls out", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "sleep", statusTurnsRemaining: 2 });
  seedInventoryItem({ playerId: "p1", itemId: "awakening", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "awakening", "mon1");

  assert.equal(result.status, "success");
  const pokemon = getPlayerPokemonRow("mon1")!;
  assert.equal(pokemon.status, null);
  assert.equal(pokemon.statusTurnsRemaining, null, "a stale sleep counter must never survive the cure");
});

test("Ice Heal cures freeze", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "freeze" });
  seedInventoryItem({ playerId: "p1", itemId: "ice-heal", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "ice-heal", "mon1");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon1")!.status, null);
});

test("Full Heal cures each of the 5 supported statuses, clearing statusTurnsRemaining every time", async () => {
  const statuses = ["poison", "burn", "paralysis", "sleep", "freeze"] as const;

  for (const status of statuses) {
    resetFakeDb();
    seedPlayerPokemon({ id: "mon1", playerId: "p1", status, statusTurnsRemaining: status === "sleep" ? 2 : null });
    seedInventoryItem({ playerId: "p1", itemId: "full-heal", quantity: 1 });

    const result = await applyMedicineItemUse("p1", "full-heal", "mon1");

    assert.equal(result.status, "success", `Full Heal must cure ${status}`);
    if (result.status !== "success") continue;
    assert.equal(result.curedStatus, status);

    const pokemon = getPlayerPokemonRow("mon1")!;
    assert.equal(pokemon.status, null);
    assert.equal(pokemon.statusTurnsRemaining, null);
  }
});

test("wrong medicine for the current status is rejected — status untouched, item NOT consumed", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "burn" });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 1 }); // cures poison, not burn

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon1")!.status, "burn", "status must be untouched on rejection");
  assert.equal(getInventoryItemRow("p1", "antidote")?.quantity, 1, "item must not be consumed on rejection");
});

test("a healthy (no status) target is rejected — nothing to cure, item not consumed", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: null });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "invalid-target");
  assert.equal(getInventoryItemRow("p1", "antidote")?.quantity, 1);
});

test("a fainted target is rejected even while carrying the matching status — item not consumed", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "poison", currentHp: 0 });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon1")!.status, "poison", "status must be untouched on rejection");
  assert.equal(getInventoryItemRow("p1", "antidote")?.quantity, 1);
});

test("ownership is validated — a Pokémon belonging to a different player is rejected, item not consumed", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "other-player", status: "poison" });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "not-owned");
  assert.equal(getInventoryItemRow("p1", "antidote")?.quantity, 1);
});

test("no inventory of the item is rejected — 'no-item', the target's status is left untouched", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "poison" });
  // No seedInventoryItem call at all — the player owns none of this item.

  const result = await applyMedicineItemUse("p1", "antidote", "mon1");

  assert.equal(result.status, "no-item");
  assert.equal(getPlayerPokemonRow("mon1")!.status, "poison");
});

test("double-submit for the last unit cures exactly once — the row is deleted at 0 (never left over-consumed), and the second attempt lands on an already-healthy target", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", status: "poison" });
  seedInventoryItem({ playerId: "p1", itemId: "antidote", quantity: 1 });

  const first = await applyMedicineItemUse("p1", "antidote", "mon1");
  assert.equal(first.status, "success");
  assert.equal(getInventoryItemRow("p1", "antidote"), undefined, "a quantity-0 row is deleted, never left behind");

  const second = await applyMedicineItemUse("p1", "antidote", "mon1");
  // Same "invalid-target" a genuinely healthy Pokémon gets — never a
  // crash, and never a second consumption of an item the player no longer
  // has (there's also nothing left to consume: the row is already gone).
  assert.equal(second.status, "invalid-target");
});

// EXISTING MEDICINE MUST NOT BREAK
test("Potion (plain heal) still works exactly as before — unaffected by the new cure-status branch", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", speciesId: "charmander", level: 20, currentHp: 10 });
  seedInventoryItem({ playerId: "p1", itemId: "potion", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "potion", "mon1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.curedStatus, null, "a plain heal never reports a cured status");
  assert.ok(result.newHp > 10, "HP must actually increase");
});

test("Revive still works exactly as before — only ever targets a fainted Pokémon", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", speciesId: "charmander", level: 20, currentHp: 0 });
  seedInventoryItem({ playerId: "p1", itemId: "revive", quantity: 1 });

  const success = await applyMedicineItemUse("p1", "revive", "mon1");
  assert.equal(success.status, "success");
  if (success.status !== "success") return;
  assert.equal(success.curedStatus, null);
  assert.ok(success.newHp > 0);
});

test("Revive still rejects a non-fainted target, exactly as before", async () => {
  seedPlayerPokemon({ id: "mon1", playerId: "p1", currentHp: 10 });
  seedInventoryItem({ playerId: "p1", itemId: "revive", quantity: 1 });

  const result = await applyMedicineItemUse("p1", "revive", "mon1");
  assert.equal(result.status, "invalid-target");
});
