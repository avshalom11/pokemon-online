// GLOBAL CHAT — focused coverage for the required cases. The service/action
// layer is exercised behaviorally against the real fake DB/session (same
// convention every other *.action.test.ts in this codebase already
// establishes — see e.g. features/hatchery/actions/start-incubation.action.
// test.ts); shared-layout placement and UI-only concerns (minimize/expand,
// never touching battle-lock state) are checked at the source level, same
// "no React-render/DOM harness" convention features/home/significant-
// captures.test.ts already established for its own UI checks.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { sendGlobalChatMessageAction, getGlobalChatMessagesAction } from "@/features/chat/actions/global-chat.actions";
import { GLOBAL_CHAT_MAX_MESSAGES, GLOBAL_CHAT_MESSAGE_MAX_LENGTH } from "@/features/chat/config/global-chat.config";
import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import {
  getGlobalChatMessageCount,
  getGlobalChatMessageRows,
  resetFakeDb,
  seedGlobalChatMessage,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1", displayName: "אביב" });
  __setSession({ user: { id: "player-1" } });
});

// 1
test("1: an authenticated player can send a message", async () => {
  const result = await sendGlobalChatMessageAction("מישהו מצא היום אגדי?");
  assert.equal(result.ok, true);
  assert.equal(getGlobalChatMessageCount(), 1);
  assert.equal(getGlobalChatMessageRows()[0]?.message, "מישהו מצא היום אגדי?");
});

// 2
test("2: an unauthenticated caller cannot send", async () => {
  __setSession(null);
  const result = await sendGlobalChatMessageAction("הודעה");
  assert.deepEqual(result, { ok: false, error: "unauthenticated" });
  assert.equal(getGlobalChatMessageCount(), 0, "no row must ever be created for an unauthenticated caller");
});

// 3
test("3: an empty message is rejected", async () => {
  const result = await sendGlobalChatMessageAction("");
  assert.deepEqual(result, { ok: false, error: "empty" });
  assert.equal(getGlobalChatMessageCount(), 0);
});

// 4
test("4: a message over 300 characters is rejected", async () => {
  const tooLong = "א".repeat(GLOBAL_CHAT_MESSAGE_MAX_LENGTH + 1);
  const result = await sendGlobalChatMessageAction(tooLong);
  assert.deepEqual(result, { ok: false, error: "too-long" });
  assert.equal(getGlobalChatMessageCount(), 0);

  const exactlyAtLimit = "א".repeat(GLOBAL_CHAT_MESSAGE_MAX_LENGTH);
  const okResult = await sendGlobalChatMessageAction(exactlyAtLimit);
  assert.equal(okResult.ok, true, "a message exactly at the limit must still be accepted");
});

// 5
test("5: whitespace is trimmed — a whitespace-only message is rejected as empty, surrounding whitespace on a real message is stripped before storage", async () => {
  const whitespaceOnly = await sendGlobalChatMessageAction("   \n\t  ");
  assert.deepEqual(whitespaceOnly, { ok: false, error: "empty" });

  const padded = await sendGlobalChatMessageAction("  שלום עולם  ");
  assert.equal(padded.ok, true);
  assert.equal(getGlobalChatMessageRows()[0]?.message, "שלום עולם");
});

// 6
test("6: latest messages are ordered correctly — oldest first, matching insertion order", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  seedGlobalChatMessage({ playerId: "player-1", message: "first", createdAt: new Date(base) });
  seedGlobalChatMessage({ playerId: "player-1", message: "second", createdAt: new Date(base + 1000) });
  seedGlobalChatMessage({ playerId: "player-1", message: "third", createdAt: new Date(base + 2000) });

  const result = await getRecentGlobalChatMessages();
  assert.deepEqual(result.map((m) => m.message), ["first", "second", "third"]);
});

// 7
test("7: only the latest GLOBAL_CHAT_MAX_MESSAGES are ever returned by a read", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  for (let i = 0; i < GLOBAL_CHAT_MAX_MESSAGES + 5; i += 1) {
    seedGlobalChatMessage({ playerId: "player-1", message: `msg-${i}`, createdAt: new Date(base + i * 1000) });
  }

  const result = await getRecentGlobalChatMessages();
  assert.equal(result.length, GLOBAL_CHAT_MAX_MESSAGES);
  assert.equal(result[0]?.message, "msg-5", "the oldest 5 (over the cap) must be excluded from the read");
  assert.equal(result[result.length - 1]?.message, `msg-${GLOBAL_CHAT_MAX_MESSAGES + 4}`);
});

// 8
test("8: inserting message 201 removes the oldest, server-side", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  const seeded = [];
  for (let i = 0; i < GLOBAL_CHAT_MAX_MESSAGES; i += 1) {
    seeded.push(seedGlobalChatMessage({ playerId: "player-1", message: `msg-${i}`, createdAt: new Date(base + i * 1000) }));
  }
  assert.equal(getGlobalChatMessageCount(), GLOBAL_CHAT_MAX_MESSAGES);
  const oldestId = seeded[0]!.id;

  const result = await sendGlobalChatMessage("player-1", "the 201st message");
  assert.equal(result.ok, true);

  assert.equal(getGlobalChatMessageCount(), GLOBAL_CHAT_MAX_MESSAGES, "the table must be trimmed back down to the cap");
  assert.ok(!getGlobalChatMessageRows().some((row) => row.id === oldestId), "the single oldest row must be the one removed");
  assert.ok(getGlobalChatMessageRows().some((row) => row.message === "the 201st message"), "the newly-inserted message must survive cleanup");
});

// 9
test("9: concurrent inserts never grow the table past the cap", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  for (let i = 0; i < GLOBAL_CHAT_MAX_MESSAGES - 1; i += 1) {
    seedGlobalChatMessage({ playerId: "player-1", message: `msg-${i}`, createdAt: new Date(base + i * 1000) });
  }
  assert.equal(getGlobalChatMessageCount(), GLOBAL_CHAT_MAX_MESSAGES - 1);

  seedPlayerProfile({ id: "player-a" });
  seedPlayerProfile({ id: "player-b" });
  const [resultA, resultB] = await Promise.all([
    sendGlobalChatMessage("player-a", "concurrent A"),
    sendGlobalChatMessage("player-b", "concurrent B"),
  ]);

  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);
  const finalCount = getGlobalChatMessageCount();
  assert.ok(finalCount <= GLOBAL_CHAT_MAX_MESSAGES, `history must never exceed the cap (was ${finalCount})`);
  assert.ok(finalCount >= GLOBAL_CHAT_MAX_MESSAGES - 1, "cleanup must never remove more than the actual excess");
});

// 10
test("10: the safe public display name is resolved — never the raw playerId", async () => {
  seedPlayerProfile({ id: "player-secret", displayName: "מאמן_חשאי" });
  __setSession({ user: { id: "player-secret" } });

  const result = await sendGlobalChatMessageAction("היי");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.message.playerDisplayName, "מאמן_חשאי");
  assert.ok(!JSON.stringify(result).includes("player-secret"), "the raw playerId must never leak into the view");
});

// 11
test("11: reading/polling never modifies data", async () => {
  seedGlobalChatMessage({ playerId: "player-1", message: "hello" });
  const before = getGlobalChatMessageRows();

  await getGlobalChatMessagesAction();
  await getGlobalChatMessagesAction();
  await getRecentGlobalChatMessages();

  const after = getGlobalChatMessageRows();
  assert.equal(getGlobalChatMessageCount(), 1);
  assert.deepEqual(after, before);
});

// 12 (source) — the chat must be part of the shared authenticated layout,
// never its own separate page.
const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");

test("12: (source) the chat is rendered inside the shared authenticated (game) layout", () => {
  assert.ok(layoutSrc.includes("GlobalChatBar"), "GameLayout must render GlobalChatBar");
  assert.ok(layoutSrc.includes("getRecentGlobalChatMessages"), "GameLayout must seed the bar's initial messages server-side");
});

// 13 (source) — minimize/expand UI. Updated by the HOME EMBED +
// AUTO-MINIMIZE ELSEWHERE follow-up: the minimize/expand default is now
// route-driven (see features/chat/global-chat-presentation.test.ts), not
// localStorage-persisted — see GlobalChatBar.tsx's own doc comment for why
// that was deliberately removed. The empty-state string now lives in the
// shared GlobalChatWindow.tsx (reused by both chat presentations) rather
// than GlobalChatBar.tsx itself.
const chatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const chatWindowSrc = fs.readFileSync("features/chat/components/GlobalChatWindow.tsx", "utf8");

test("13: (source) the minimize/expand UI exists", () => {
  assert.ok(chatBarSrc.includes("צ׳אט ראשי"), "the collapsed-bar label must be present");
  assert.ok(chatBarSrc.includes("setMinimized"), "an expand/minimize toggle must exist");
  assert.ok(chatWindowSrc.includes("אין עדיין הודעות בצ׳אט"), "the required empty-state string must be present");
});

// 14 (source) — chat must never touch battle-lock state.
const chatActionsSrc = fs.readFileSync("features/chat/actions/global-chat.actions.ts", "utf8");

test("14: (source) chat never reads or modifies ActiveBattleProvider/battle-lock state", () => {
  // Checks actual USAGE (the import/hook-call/setter that would actually
  // read or touch battle-lock state) rather than a blanket substring ban —
  // this file's own doc comments legitimately name "ActiveBattleProvider"
  // in prose to document that guarantee, which a plain substring check
  // would misfire on.
  for (const src of [chatBarSrc, chatActionsSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
  }
});

// 15 — CHAT TIMESTAMPS: sentTimeLabel now carries the full date, not just
// the time, using the message's real createdAt.
test("15: a sent message's sentTimeLabel shows DD/MM/YYYY HH:MM, derived from its real createdAt", async () => {
  const result = await sendGlobalChatMessageAction("הודעה עם תאריך");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.message.sentTimeLabel, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

  const [fresh] = await getRecentGlobalChatMessages();
  assert.equal(fresh?.sentTimeLabel, result.message.sentTimeLabel);
});
