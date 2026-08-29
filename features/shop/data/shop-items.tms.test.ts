// TM SYSTEM PHASE 2 focused coverage for the Shop's TM products — prices/
// currency are centrally defined here (SHOP_ITEMS), never hardcoded a
// second time in any UI component.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getMoveById } from "@/engine/moves";
import { TM_CATALOG } from "@/features/tm-system/data/tm-catalog";
import { sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import { SHOP_ITEMS } from "./shop-items.ts";

function tmShopItems() {
  return SHOP_ITEMS.filter((item) => item.categoryId === "tms");
}

test("exactly 54 TM products exist, one per TM_CATALOG entry, under the tms category", () => {
  const items = tmShopItems();
  assert.equal(items.length, 54);
  assert.equal(items.length, TM_CATALOG.length);

  const shopItemIds = new Set(items.map((item) => item.id));
  for (const entry of TM_CATALOG) {
    assert.ok(shopItemIds.has(entry.itemId), `a shop item must exist for ${entry.itemId}`);
  }
});

test("every TM product's id is exactly \"tm-<moveId>\", matching TM_CATALOG's itemId, never a numeric TM number", () => {
  for (const entry of TM_CATALOG) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === entry.itemId);
    assert.ok(item, `a shop item must exist for ${entry.itemId}`);
    assert.equal(item!.id, `tm-${entry.moveId}`);
    assert.ok(!/\d/.test(item!.id), `itemId "${item!.id}" must not contain a generation-specific TM number`);
  }
});

test("every TM product uses Money currency and carries no level requirement field", () => {
  for (const item of tmShopItems()) {
    assert.equal(item.currency, "money");
    assert.equal("requiredLevel" in item, false, "ShopItem must have no level-requirement field at all");
  }
});

test("every TM product's display name is exactly \"TM – <Move Name>\", derived live from the move registry", () => {
  for (const entry of TM_CATALOG) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === entry.itemId)!;
    const move = getMoveById(entry.moveId)!;
    assert.equal(item.name, `TM – ${move.name}`);
  }
});

test("every TM product's tmMoveId matches its TM_CATALOG entry, and no non-TM item ever sets tmMoveId", () => {
  for (const entry of TM_CATALOG) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === entry.itemId)!;
    assert.equal(item.tmMoveId, entry.moveId);
  }

  for (const item of SHOP_ITEMS) {
    if (item.categoryId !== "tms") {
      assert.equal(item.tmMoveId, undefined, `${item.id} is not a TM but has tmMoveId set`);
    }
  }
});

test("every TM product's image is the shared per-type path, matching its TM_CATALOG entry's imagePath exactly", () => {
  for (const entry of TM_CATALOG) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === entry.itemId)!;
    assert.equal(item.imageUrl, entry.imagePath);
    assert.match(item.imageUrl, /^\/images\/items\/tms\/[A-Z][a-z]+\.png$/);
  }
});

test("TM prices exactly match the four-tier spec (Basic 1,000 / Advanced 2,500 / Premium 4,000 / Elite 5,500)", () => {
  const byMoveId = Object.fromEntries(tmShopItems().map((item) => [item.tmMoveId, item.price]));

  const basic = ["fire-punch", "thunder-punch", "ice-punch", "zen-headbutt", "hex", "draining-kiss", "bulldoze", "rock-tomb", "brick-break", "venoshock", "steel-wing", "aerial-ace", "facade"];
  const advanced = ["waterfall", "giga-drain", "psyshock", "shadow-claw", "dark-pulse", "dragon-claw", "dazzling-gleam", "dig", "rock-slide", "drain-punch", "poison-jab", "x-scissor", "air-slash", "body-slam"];
  const premium = ["flamethrower", "surf", "liquidation", "thunderbolt", "energy-ball", "ice-beam", "psychic", "shadow-ball", "crunch", "dragon-pulse", "play-rough", "sludge-bomb", "bug-buzz", "flash-cannon"];
  const elite = ["fire-blast", "thunder", "solar-beam", "blizzard", "foul-play", "draco-meteor", "earthquake", "stone-edge", "close-combat", "u-turn", "iron-head", "hurricane", "hyper-beam"];

  assert.equal(basic.length + advanced.length + premium.length + elite.length, 54);

  for (const moveId of basic) assert.equal(byMoveId[moveId], 1000, `${moveId} must be 1,000`);
  for (const moveId of advanced) assert.equal(byMoveId[moveId], 2500, `${moveId} must be 2,500`);
  for (const moveId of premium) assert.equal(byMoveId[moveId], 4000, `${moveId} must be 4,000`);
  for (const moveId of elite) assert.equal(byMoveId[moveId], 5500, `${moveId} must be 5,500`);
});

// TASK 6 — no TM-specific sell logic exists (nor should it): the existing
// generic floor(price * 0.5) rule (features/shop/services/shop-catalog.
// service.ts's sellUnitPriceFor, also used by inventory-sell.service.ts)
// already applies to any itemId, TMs included. This is a proof point, not a
// new code path.
test("the existing generic 50% sell-back rule applies unmodified to every TM tier", () => {
  const byMoveId = Object.fromEntries(tmShopItems().map((item) => [item.tmMoveId, item.price]));

  assert.equal(sellUnitPriceFor(byMoveId["fire-punch"]), 500); // Basic 1,000 -> 500
  assert.equal(sellUnitPriceFor(byMoveId["waterfall"]), 1250); // Advanced 2,500 -> 1,250
  assert.equal(sellUnitPriceFor(byMoveId["flamethrower"]), 2000); // Premium 4,000 -> 2,000
  assert.equal(sellUnitPriceFor(byMoveId["earthquake"]), 2750); // Elite 5,500 -> 2,750
});

test("no TM product id collides with any non-TM Shop item id", () => {
  const tmIds = new Set(tmShopItems().map((item) => item.id));
  const otherIds = SHOP_ITEMS.filter((item) => item.categoryId !== "tms").map((item) => item.id);
  for (const id of otherIds) {
    assert.equal(tmIds.has(id), false, `"${id}" collides with a TM item id`);
  }
});
