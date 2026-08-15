// EGGS PHASE 6 focused coverage for purchaseEggShopItemAction — runs the
// real action against the in-memory fake DB/session.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseEggShopItemAction } from "./purchase-egg-shop-item.action.ts";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });
  __setSession({ user: { id: "owner-1" } });
});

test("a successful egg purchase goes through end to end", async () => {
  const result = await purchaseEggShopItemAction("common-egg", 1);
  assert.equal(result.status, "success");
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);
  const result = await purchaseEggShopItemAction("common-egg", 1);
  assert.deepEqual(result, { status: "error" });
});

test("rejects a malformed quantity via schema validation, without reaching the service", async () => {
  const result = await purchaseEggShopItemAction("common-egg", 0);
  assert.deepEqual(result, { status: "error" });
});
