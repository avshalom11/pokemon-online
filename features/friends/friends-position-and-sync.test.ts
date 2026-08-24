// FRIENDS UI — MINIMIZED CHAT POSITION + LIVE FRIEND REMOVAL SYNC — focused
// coverage for this task's own 8 requirements. Behavioral checks run the
// real friendship/private-chat services against the in-memory fake DB;
// UI-wiring facts (positioning, polling, watcher wiring) are checked at the
// source level — this project's established convention (see e.g.
// features/friends/friends-quick-actions.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getFriendshipRelation, removeFriend } from "@/features/friends/services/friendship.service";
import { getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import { getFriendshipRowsForPlayer, resetFakeDb, seedFriendship, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב", username: "aviv" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה", username: "noa" });
});

const socialDockSrc = fs.readFileSync("features/friends/components/SocialDock.tsx", "utf8");
const friendsBarSrc = fs.readFileSync("features/friends/components/FriendsBar.tsx", "utf8");
const floatingWindowSrc = fs.readFileSync("features/friends/components/FloatingPrivateChatWindow.tsx", "utf8");
const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
const friendsDataContextSrc = fs.readFileSync("features/friends/context/friends-data-context.tsx", "utf8");
const friendsConfigSrc = fs.readFileSync("features/friends/config/friends.config.ts", "utf8");
const syncWatcherSrc = fs.readFileSync("features/friends/components/FriendshipSyncWatcher.tsx", "utf8");
// Strips `//` line-comments before a substring check runs, so a doc comment
// legitimately describing an OLD/forbidden pattern in prose (e.g. these
// files' own comments naming the exact past hardcoded-offset bug) never
// false-positives a check meant to catch that pattern in real, executable
// code.
const stripLineComments = (src: string) =>
  src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

// 1 — minimized private chat sits immediately LEFT of the Friends Bar.
test("1: (source) SocialDock renders FloatingPrivateChatWindow before FriendsBar in a plain LTR flex row, so private chat always sits left of the Friends Bar", () => {
  assert.match(socialDockSrc, /dir="ltr"/, "must use a plain, unreversed flex direction so DOM order maps directly to left/right");
  assert.match(socialDockSrc, /flex-row/);
  const dockOpenIndex = layoutSrc.indexOf("<SocialDock>");
  const floatingIndex = layoutSrc.indexOf("<FloatingPrivateChatWindow");
  const barIndex = layoutSrc.indexOf("<FriendsBar");
  const dockCloseIndex = layoutSrc.indexOf("</SocialDock>");
  assert.ok(dockOpenIndex >= 0 && dockCloseIndex > dockOpenIndex, "SocialDock must actually be mounted in the layout");
  assert.ok(floatingIndex > dockOpenIndex && floatingIndex < dockCloseIndex, "FloatingPrivateChatWindow must be inside SocialDock");
  assert.ok(barIndex > floatingIndex && barIndex < dockCloseIndex, "FriendsBar must come AFTER FloatingPrivateChatWindow inside SocialDock, so it lands right-most");
});

// 2 — never centers/floats independently, in ANY combination of
// collapsed/expanded state on either panel — proven by neither child
// carrying its own position at all, only the one shared dock.
test("2: (source) neither FriendsBar nor FloatingPrivateChatWindow carries its own fixed/right positioning in any branch — only SocialDock does", () => {
  for (const src of [friendsBarSrc, floatingWindowSrc]) {
    const code = stripLineComments(src);
    assert.ok(!code.includes("fixed bottom-"), "must never self-position with `fixed`");
    assert.ok(!code.includes("right-4"), "must never carry its own right offset");
    assert.ok(!code.includes("right-["), "must never carry its own hardcoded rem/px right offset for one particular state");
  }
  assert.match(socialDockSrc, /fixed bottom-\S*\s+right-4/, "exactly one shared place (SocialDock) owns the fixed bottom-right anchor");
});

// 3 — User1 removal updates their OWN Friends list immediately (already
// proven behaviorally by removeFriend deleting the row; this confirms the
// optimistic local-state path feeding FriendsBar remains wired, carried
// over unchanged from the prior ticket).
test("3: (source) FriendsDataProvider's removeFriend updates local `friends` state optimistically, before the server round trip resolves", () => {
  const removeFnBody = friendsDataContextSrc.slice(friendsDataContextSrc.indexOf("const removeFriend = useCallback"));
  const optimisticIndex = removeFnBody.indexOf("setFriends((current) => current.filter");
  const awaitIndex = removeFnBody.indexOf("await removeFriendAction");
  assert.ok(optimisticIndex >= 0 && awaitIndex > optimisticIndex, "local state must update BEFORE the server round trip");
});

test("3b: removeFriend actually deletes the friendship row for the remover", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const result = await removeFriend("player-a", "player-b");
  assert.deepEqual(result, { ok: true });
  assert.equal(getFriendshipRowsForPlayer("player-a").length, 0);
});

// 4 — User2 detects removal WITHOUT a full page refresh: proven by
// FriendsDataProvider polling in the background (the only mechanism that
// can discover a change the OTHER side made), reusing the same lightweight
// setInterval + server-action pattern already used elsewhere in the app.
test("4: (source) FriendsDataProvider polls refresh() in the background on a fixed interval, so User2's client eventually discovers a removal User1 made server-side without any manual action", () => {
  assert.match(friendsDataContextSrc, /const interval = setInterval\(\(\) => \{\s*refresh\(\);\s*\}, FRIENDS_DATA_POLL_INTERVAL_MS\);/, "must poll refresh() via setInterval using the shared config constant");
  assert.ok(friendsDataContextSrc.includes("clearInterval(interval)"), "must clean up the interval on unmount");
  assert.match(friendsConfigSrc, /export const FRIENDS_DATA_POLL_INTERVAL_MS = 2500;/, "must stay in the same ~2-3s cadence already established elsewhere in the app");
});

// 5 — User2's removed friend disappears from their Friends Bar: follows
// directly from FriendsBar reading only the shared `friends` array (already
// proven by friends-bar-remove.test.ts's test 10), combined with test 4
// above (the poll is what keeps that array honest against server truth for
// changes User2's own client didn't make).
test("5: (source) FriendsBar renders only the shared context's `friends` array — the same array the background poll refreshes — no separate/local copy", () => {
  assert.match(friendsBarSrc, /const \{ friends \} = useFriendsData\(\)/);
});

// 6 — an open private chat with the removed friend closes automatically
// once the removal is detected, covering BOTH the local-removal case
// (useRemoveFriend's own explicit closeChat()) and the remote-removal case
// (only ever discoverable via the poll — FriendshipSyncWatcher is the sole
// mechanism for that one).
test("6: (source) FriendshipSyncWatcher derives 'still friends?' from the live `friends` list on every change and closes the open chat the moment its friend is no longer present", () => {
  assert.ok(syncWatcherSrc.includes("useFriendsData()"));
  assert.ok(syncWatcherSrc.includes("usePrivateChatWindow()"));
  assert.match(syncWatcherSrc, /friends\.some\(\(friend\) => friend\.playerId === activeConversation\.friendPlayerId\)/, "must check the CURRENT friend against the live friends list, not a cached/stale snapshot");
  assert.match(syncWatcherSrc, /if \(!stillFriends\) \{\s*closeChat\(\);\s*\}/, "must actually close the chat once the friend is gone");
  const mountIndex = layoutSrc.indexOf("<FriendshipSyncWatcher");
  assert.ok(mountIndex >= 0, "FriendshipSyncWatcher must actually be mounted in the (game) layout");
});

test("6b: after removal, the removed friend is genuinely gone from getFriendshipRelation for both sides (what FriendshipSyncWatcher's poll-fed `friends` list ultimately reflects)", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  await removeFriend("player-a", "player-b");
  assert.equal((await getFriendshipRelation("player-a", "player-b")).status, "none");
  assert.equal((await getFriendshipRelation("player-b", "player-a")).status, "none");
});

// 7 — no WebSocket / new realtime subsystem introduced anywhere by this
// task's new files.
test("7: (source) none of this task's new/changed friends files ever construct a real WebSocket — the poll reuses plain setInterval + a server action", () => {
  for (const src of [friendsDataContextSrc, syncWatcherSrc, socialDockSrc, friendsBarSrc, floatingWindowSrc]) {
    // Checks actual USAGE (a real WebSocket construction), not a blanket
    // "websocket" substring ban — doc comments in this codebase legitimately
    // say "no WebSockets" in prose.
    assert.ok(!src.includes("new WebSocket("), "must never construct a real WebSocket");
  }
});

// 8 — private-chat authorization remains unchanged: areFriends() is still
// re-checked on every send AND on every (re)open, exactly as the prior
// ticket left it — this task does not touch private-chat.service.ts.
test("8: after removal, neither side can send a new private message or reopen the conversation — the existing areFriends() authorization is untouched by this task", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  assert.equal(opened.ok, true);
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  await removeFriend("player-a", "player-b");

  const sendResult = await sendPrivateMessage("player-a", conversationId, "עדיין אפשר?");
  assert.deepEqual(sendResult, { ok: false, error: "not-friends" });

  const reopenResult = await getOrCreateConversation("player-b", "player-a");
  assert.deepEqual(reopenResult, { ok: false, error: "not-friends" });
});
