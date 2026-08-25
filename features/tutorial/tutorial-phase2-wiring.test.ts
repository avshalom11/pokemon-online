// GAME TUTORIAL — PHASE 2: REAL ACTIONS. UI wiring checks (source-level —
// this project has no React-render/DOM harness, same established
// convention as tutorial-phase0/1-wiring.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pokemonCenterSrc = readFileSync(
  new URL("../pokemon-center/components/PokemonCenterContent.tsx", import.meta.url),
  "utf8"
);
const shopSrc = readFileSync(new URL("../shop/components/ShopContent.tsx", import.meta.url), "utf8");
const healPartyServiceSrc = readFileSync(new URL("../pokemon-center/services/heal-party.service.ts", import.meta.url), "utf8");
const shopPurchaseServiceSrc = readFileSync(new URL("../shop/services/shop-purchase.service.ts", import.meta.url), "utf8");

test("PokemonCenterContent registers a real spotlight target for the heal flow", () => {
  assert.ok(pokemonCenterSrc.includes('useTutorialTarget("pokemon-center-heal-flow")'));
  assert.ok(pokemonCenterSrc.includes("ref={healFlowTargetRef}"));
});

test("PokemonCenterContent reports 'pokemon-healed' ONLY after the REAL healPartyAction result confirms success AND the Starter is among the healed ids — never a bare click", () => {
  const handlerBody = pokemonCenterSrc.slice(
    pokemonCenterSrc.indexOf("function handleConfirmHeal"),
    pokemonCenterSrc.indexOf("const dialogueActions")
  );
  const healedBranch = handlerBody.slice(handlerBody.indexOf('result.status === "healed"'));

  assert.ok(healedBranch.includes("healedStarter"), "must check the real result's own healedIds, not just that SOMETHING was healed");
  assert.ok(healedBranch.includes("pokemon.isStarter && healedIds.has(pokemon.id)"));
  assert.match(healedBranch, /if \(healedStarter\) reportAction\("pokemon-healed"\);/);

  // Never reported from the "nothing-to-heal" or generic-error branches.
  const nothingToHealBranch = handlerBody.slice(
    handlerBody.indexOf('result.status === "nothing-to-heal"'),
    handlerBody.indexOf('setHealError(GENERIC_ERROR_MESSAGE)')
  );
  assert.ok(!nothingToHealBranch.includes("reportAction"));
});

test("PokemonCenterContent never duplicates healing logic — it still calls the one real healPartyAction, and the real service is untouched", () => {
  assert.ok(pokemonCenterSrc.includes("await healPartyAction(idsToHeal)"));
  assert.ok(!pokemonCenterSrc.includes("prisma"), "a client component must never touch Prisma directly");
  assert.ok(!healPartyServiceSrc.includes("tutorial"), "the real heal service must stay entirely unaware the Tutorial exists");
});

test("ShopContent registers a real spotlight target for the purchase flow", () => {
  assert.ok(shopSrc.includes('useTutorialTarget("shop-purchase-flow")'));
  assert.ok(shopSrc.includes("ref={purchaseFlowTargetRef}"));
});

test("ShopContent reports 'poke-ball-purchased' ONLY after the REAL purchaseShopItemAction result confirms exactly item 'poke-ball', quantity 1, price 100, currency money — never a bare click", () => {
  const handlerBody = shopSrc.slice(
    shopSrc.indexOf("function handleConfirmPurchase"),
    shopSrc.indexOf("return (", shopSrc.indexOf("function handleConfirmPurchase"))
  );
  const successBranch = handlerBody.slice(handlerBody.indexOf('result.status === "success"'));

  assert.ok(successBranch.includes('item.id === TUTORIAL_POKE_BALL_ITEM_ID'));
  assert.ok(successBranch.includes("result.quantity === 1"));
  assert.ok(successBranch.includes("result.totalPrice === 100"));
  assert.ok(successBranch.includes('result.currency === "money"'));
  assert.match(successBranch, /reportAction\("poke-ball-purchased"\);/);
});

test("ShopContent's own Poké Ball constant matches the real shop catalog entry (id, price, currency) — never a duplicated/hardcoded guess", () => {
  const shopItemsSrc = readFileSync(new URL("../shop/data/shop-items.ts", import.meta.url), "utf8");
  const pokeBallEntry = shopItemsSrc.slice(shopItemsSrc.indexOf('id: "poke-ball"'), shopItemsSrc.indexOf("},", shopItemsSrc.indexOf('id: "poke-ball"')));

  assert.ok(pokeBallEntry.includes("price: 100"));
  assert.ok(pokeBallEntry.includes('currency: "money"'));
  assert.ok(shopSrc.includes('const TUTORIAL_POKE_BALL_ITEM_ID = "poke-ball";'));
});

test("ShopContent never duplicates purchase/currency logic — it still calls the one real purchaseShopItemAction, and the real service is untouched", () => {
  assert.ok(shopSrc.includes("await purchaseShopItemAction(item.id, quantity)"));
  assert.ok(!shopSrc.includes("prisma"), "a client component must never touch Prisma directly");
  assert.ok(!shopPurchaseServiceSrc.includes("tutorial"), "the real purchase service must stay entirely unaware the Tutorial exists");
});

test("reportAction is a no-op unless the Tutorial is currently awaiting exactly that action — verified once in tutorial-context.tsx, never re-implemented per call site", () => {
  const contextSrc = readFileSync(new URL("./context/tutorial-context.tsx", import.meta.url), "utf8");
  assert.match(contextSrc, /function reportAction\(actionId: TutorialActionId\) \{\s*if \(panelMode !== "awaiting"\) return;/);
});
