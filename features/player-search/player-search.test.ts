// PLAYER SEARCH — focused coverage. Runs the real service against the
// in-memory fake DB (user.findMany with a contains+mode:"insensitive"
// filter — see test/support/fakes/prisma.fake.ts's own doc comment for
// that fake support).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { PLAYER_SEARCH_RESULT_LIMIT } from "@/features/player-search/config/player-search.config";
import { searchPlayersByUsername } from "@/features/player-search/services/player-search.service";
import { resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

// 1
test("1: finds a partial username match", async () => {
  seedPlayerProfile({ id: "p1", displayName: "אביב הראשון", username: "avivi_the_first" });
  seedPlayerProfile({ id: "p2", displayName: "מישהו אחר", username: "someone_else" });

  const results = await searchPlayersByUsername("avivi");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.username, "avivi_the_first");
  assert.equal(results[0]?.displayName, "אביב הראשון");
});

// 2
test("2: search is case-insensitive", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Test Player", username: "CoolTrainer99" });

  const lower = await searchPlayersByUsername("cooltrainer");
  const upper = await searchPlayersByUsername("COOLTRAINER");
  const mixed = await searchPlayersByUsername("CoolTrAiNeR");

  for (const results of [lower, upper, mixed]) {
    assert.equal(results.length, 1, "a case-insensitive partial match must be found regardless of the query's own casing");
    assert.equal(results[0]?.username, "CoolTrainer99");
  }
});

// 3
test("3: the result limit is enforced — never more than PLAYER_SEARCH_RESULT_LIMIT, never the full player database", async () => {
  for (let i = 0; i < PLAYER_SEARCH_RESULT_LIMIT + 5; i += 1) {
    seedPlayerProfile({ id: `p${i}`, displayName: `Player ${i}`, username: `trainer_${i}` });
  }

  const results = await searchPlayersByUsername("trainer");
  assert.equal(results.length, PLAYER_SEARCH_RESULT_LIMIT);
});

// 4
test("4: search results expose only safe public identity fields — no email, no internal id", async () => {
  seedPlayerProfile({ id: "secret-internal-id", displayName: "שחקן", username: "findme" });

  const results = await searchPlayersByUsername("findme");
  assert.equal(results.length, 1);

  const keys = Object.keys(results[0]!).sort();
  assert.deepEqual(keys, ["avatarUrl", "displayName", "username"].sort());
  assert.ok(!JSON.stringify(results[0]).includes("secret-internal-id"), "the raw internal PlayerProfile id must never leak into a search result");
  assert.ok(!JSON.stringify(results).toLowerCase().includes("@"), "no email-shaped value must ever appear in a search result");
});

// 5
test("5: an empty (or whitespace-only) query returns no results — never the full player database", async () => {
  seedPlayerProfile({ id: "p1", displayName: "שחקן", username: "someuser" });

  assert.deepEqual(await searchPlayersByUsername(""), []);
  assert.deepEqual(await searchPlayersByUsername("   "), []);
});

// 6
test("6: the query is trimmed before matching", async () => {
  seedPlayerProfile({ id: "p1", displayName: "שחקן", username: "trimtest" });

  const results = await searchPlayersByUsername("  trimtest  ");
  assert.equal(results.length, 1);
});

// 7 — clicking a search result opens the player's public profile (never a
// second profile page/view).
test("7: (source) clicking a search result navigates to /profile/[username], the existing route", () => {
  const src = fs.readFileSync("features/player-search/components/PlayerSearchModal.tsx", "utf8");
  assert.match(src, /href=\{`\/profile\/\$\{encodeURIComponent\(result\.username\)\}`\}/, "each result must link to the existing /profile/[username] route");
});

// 8 — never a direct Prisma query from React.
test("8: (source) the search action delegates to the one clean service, never a direct Prisma query", () => {
  const actionSrc = fs.readFileSync("features/player-search/actions/player-search.actions.ts", "utf8");
  assert.ok(!actionSrc.includes("prisma"), "the action must never touch Prisma directly");
  assert.ok(actionSrc.includes("searchPlayersByUsername("), "the action must delegate to the service");

  const modalSrc = fs.readFileSync("features/player-search/components/PlayerSearchModal.tsx", "utf8");
  assert.ok(!modalSrc.includes("prisma"), "the client modal must never touch Prisma directly");
});
