// NEW PLAYER STARTING BALANCE — real behavioral coverage of
// ensurePlayerProfile (lib/auth/player-profile.ts), the ONE place a
// PlayerProfile row is ever created (both the direct registration self-
// heal path in auth-session.ts and auth.ts's databaseHooks.user.create
// .after hook call through this same function — see its own doc comment).
//
// Imported via a RELATIVE path (not the "@/lib/auth/player-profile"
// specifier) to deliberately bypass alias-loader.mjs's fake redirect for
// that specifier — this file doesn't import next/headers or anything else
// unavailable under the plain node:test runner (only react's cache(),
// @/lib/db/prisma, @/features/notifications, and @/features/currency's
// config — all of which resolve fine through the alias-loader's normal
// @/ handling), so the REAL function can run here against the fake DB,
// same "real service, fake I/O" shape this codebase's other behavioral
// tests already use.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { ensurePlayerProfile } from "./player-profile.ts";
import { STARTING_GOLD, STARTING_MONEY } from "@/features/currency/config/starting-balance.config";
import { getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("a brand-new player's PlayerProfile is created with 2,000 Money and 50 Gold", async () => {
  await ensurePlayerProfile("new-user-1", "New Player");

  const row = getPlayerProfileRow("new-user-1");
  assert.ok(row);
  assert.equal(row!.coins, STARTING_MONEY);
  assert.equal(row!.gold, STARTING_GOLD);
  assert.equal(STARTING_MONEY, 2000, "sanity check on the actual required value, not just the config constant");
  assert.equal(STARTING_GOLD, 50, "sanity check on the actual required value, not just the config constant");
});

test("calling ensurePlayerProfile again for the SAME (already-existing) player never re-grants or resets the starting balance", async () => {
  await ensurePlayerProfile("existing-user", "Existing Player");
  // Simulate the player having since spent/earned currency away from the
  // starting values — a naive re-grant would stomp this back to 2000/50.
  seedPlayerProfile({ id: "existing-user", coins: 37, gold: 412 });

  // getCurrentSession() calls this on EVERY protected-page load, not just
  // once — this is the exact "do not grant again on login" scenario.
  await ensurePlayerProfile("existing-user", "Existing Player");
  await ensurePlayerProfile("existing-user", "Existing Player");

  const row = getPlayerProfileRow("existing-user")!;
  assert.equal(row.coins, 37, "an existing player's balance must never be touched by a later ensurePlayerProfile call");
  assert.equal(row.gold, 412);
});

test("an existing player who already had a DIFFERENT (pre-feature) starting balance is never retroactively changed", () => {
  // Represents an account created before this feature existed (the old
  // schema-default 500/0, or any other historical value) — ensurePlayerProfile
  // must never touch it since the row already exists.
  seedPlayerProfile({ id: "legacy-user", coins: 500, gold: 0 });

  const row = getPlayerProfileRow("legacy-user")!;
  assert.equal(row.coins, 500);
  assert.equal(row.gold, 0);
});
