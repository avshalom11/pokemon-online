// Focused regression test for the TM SYSTEM PHASE 1 catalog (data
// foundation only — see tm-catalog.ts's own doc comment for what is and
// isn't in scope yet).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getMoveById, moveTypeSchema } from "@/engine/moves";
import type { MoveType } from "@/engine/moves";
import { TM_CATALOG, TmCatalogValidationError, validateTmCatalog, getTmCatalogEntryByItemId, getTmCatalogEntryByMoveId } from "./tm-catalog";
import { tmTypeImagePath } from "../media/tm-item-media-paths";

const ALL_TYPES = moveTypeSchema.options as readonly MoveType[];

test("the catalog contains exactly 54 TMs — 3 per Pokémon type across all 18 types", () => {
  assert.equal(TM_CATALOG.length, 54);

  for (const type of ALL_TYPES) {
    const countForType = TM_CATALOG.filter((entry) => entry.type === type).length;
    assert.equal(countForType, 3, `expected exactly 3 TMs of type "${type}", got ${countForType}`);
  }
});

test("every itemId is exactly \"tm-<moveId>\", never a numeric TM slot", () => {
  for (const entry of TM_CATALOG) {
    assert.equal(entry.itemId, `tm-${entry.moveId}`);
    assert.ok(!/\d/.test(entry.itemId), `itemId "${entry.itemId}" must not contain a generation-specific TM number`);
  }
});

test("every moveId resolves in the real move registry, and its type matches", () => {
  for (const entry of TM_CATALOG) {
    const move = getMoveById(entry.moveId);
    assert.ok(move, `moveId "${entry.moveId}" must exist in the move registry`);
    assert.equal(move!.type, entry.type, `moveId "${entry.moveId}" is type "${move!.type}", catalog declares "${entry.type}"`);
  }
});

test("there are no duplicate itemIds or moveIds", () => {
  const itemIds = TM_CATALOG.map((entry) => entry.itemId);
  const moveIds = TM_CATALOG.map((entry) => entry.moveId);
  assert.equal(new Set(itemIds).size, itemIds.length, "duplicate itemId found");
  assert.equal(new Set(moveIds).size, moveIds.length, "duplicate moveId found");
});

test("every entry's imagePath is the shared per-type path, derived via tmTypeImagePath", () => {
  for (const entry of TM_CATALOG) {
    assert.equal(entry.imagePath, tmTypeImagePath(entry.type));
  }

  // Every TM of the same type shares the exact same image path.
  for (const type of ALL_TYPES) {
    const paths = new Set(TM_CATALOG.filter((entry) => entry.type === type).map((entry) => entry.imagePath));
    assert.equal(paths.size <= 1, true, `all TMs of type "${type}" must share one image path`);
  }
});

test("Sludge Bomb (added in this phase) is present and correctly typed as Poison", () => {
  const entry = getTmCatalogEntryByMoveId("sludge-bomb");
  assert.ok(entry, "tm-sludge-bomb must exist in the catalog");
  assert.equal(entry!.itemId, "tm-sludge-bomb");
  assert.equal(entry!.type, "poison");
  assert.equal(getMoveById("sludge-bomb")?.type, "poison");
});

// TM CATALOG SWAP — Fly replaced Aerial Ace in the Flying category (only 1-2
// evolutions/uses justified keeping a whole item around for Aerial Ace's own
// unrelated evolution-item context; here it's simply the least iconic of the
// 3 Flying TMs). Total count and per-type count are both preserved — pure
// 1-for-1 swap, no new slot.
test("Aerial Ace is retired as a TM; Fly replaced it in the Flying category", () => {
  assert.equal(getTmCatalogEntryByMoveId("aerial-ace"), undefined, "tm-aerial-ace must no longer exist in the catalog");
  assert.equal(getTmCatalogEntryByItemId("tm-aerial-ace"), undefined);

  const flyEntry = getTmCatalogEntryByMoveId("fly");
  assert.ok(flyEntry, "tm-fly must exist in the catalog");
  assert.equal(flyEntry!.itemId, "tm-fly");
  assert.equal(flyEntry!.type, "flying");
  assert.equal(getMoveById("fly")?.type, "flying");
});

test("Air Slash and Hurricane are unchanged by the Aerial Ace -> Fly swap", () => {
  assert.ok(getTmCatalogEntryByMoveId("air-slash"));
  assert.ok(getTmCatalogEntryByMoveId("hurricane"));
});

test("getTmCatalogEntryByItemId / getTmCatalogEntryByMoveId resolve consistently", () => {
  for (const entry of TM_CATALOG) {
    assert.deepEqual(getTmCatalogEntryByItemId(entry.itemId), entry);
    assert.deepEqual(getTmCatalogEntryByMoveId(entry.moveId), entry);
  }

  assert.equal(getTmCatalogEntryByItemId("tm-does-not-exist"), undefined);
  assert.equal(getTmCatalogEntryByMoveId("does-not-exist"), undefined);
});

test("validateTmCatalog rejects an unknown moveId", () => {
  assert.throws(
    () => validateTmCatalog([{ itemId: "tm-not-a-real-move", moveId: "not-a-real-move", type: "normal", imagePath: tmTypeImagePath("normal") }]),
    TmCatalogValidationError
  );
});

test("validateTmCatalog rejects a moveId/type mismatch", () => {
  assert.throws(
    () => validateTmCatalog([{ itemId: "tm-flamethrower", moveId: "flamethrower", type: "water", imagePath: tmTypeImagePath("water") }]),
    TmCatalogValidationError
  );
});

test("validateTmCatalog rejects an itemId that isn't \"tm-<moveId>\"", () => {
  assert.throws(
    () => validateTmCatalog([{ itemId: "tm24", moveId: "thunderbolt", type: "electric", imagePath: tmTypeImagePath("electric") }]),
    TmCatalogValidationError
  );
});

test("validateTmCatalog rejects duplicate itemIds/moveIds", () => {
  const entry = { itemId: "tm-surf", moveId: "surf", type: "water" as const, imagePath: tmTypeImagePath("water") };
  assert.throws(() => validateTmCatalog([entry, entry]), TmCatalogValidationError);
});
