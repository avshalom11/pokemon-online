// ONLINE PRESENCE — GLOBAL CHAT + FRIENDS + HOME ONLINE COUNT. Focused
// coverage for this task's own 6 requirements (section 8). Behavioral
// checks run the real presence/chat/friendship services against the
// in-memory fake DB — same convention every other persistence-layer test
// in this codebase already establishes; UI-wiring facts (status dots,
// heartbeat cadence, no battle/chat/friends interference) are checked at
// the source level — this project's established "no React-render/DOM
// harness" convention (see e.g. features/friends/friends-quick-actions.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { PRESENCE_ONLINE_WINDOW_MS, isOnline } from "@/features/presence/config/presence.config";
import { getOnlinePlayerCount, getOnlinePlayerIdSet, markOffline, recordHeartbeat } from "@/features/presence/services/presence.service";
import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import { getFriendsAndRequests } from "@/features/friends/services/friendship.service";
import { getPlayerProfileRow, resetFakeDb, seedFriendship, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerProfile({ id: "player-c", displayName: "דני" });
});

const heartbeatSrc = fs.readFileSync("features/presence/components/PresenceHeartbeat.tsx", "utf8");
const presenceActionsSrc = fs.readFileSync("features/presence/actions/presence.actions.ts", "utf8");
const presenceConfigSrc = fs.readFileSync("features/presence/config/presence.config.ts", "utf8");
const globalChatWindowSrc = fs.readFileSync("features/chat/components/GlobalChatWindow.tsx", "utf8");
const friendsBarSrc = fs.readFileSync("features/friends/components/FriendsBar.tsx", "utf8");
const statusDotSrc = fs.readFileSync("components/social/OnlineStatusDot.tsx", "utf8");
const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
const authActionsSrc = fs.readFileSync("lib/auth/actions.ts", "utf8");
const presenceServiceSrc = fs.readFileSync("features/presence/services/presence.service.ts", "utf8");

// 1 — fresh heartbeat => online.
test("1: a player with a fresh (just-now) heartbeat is considered online", () => {
  assert.equal(isOnline(new Date()), true);
});

test("1b: recordHeartbeat actually writes lastSeenAt, and the player is then resolved as online", async () => {
  assert.equal(getPlayerProfileRow("player-a")?.lastSeenAt, null, "a never-seen player starts out with no lastSeenAt");
  await recordHeartbeat("player-a");
  const row = getPlayerProfileRow("player-a");
  assert.ok(row?.lastSeenAt instanceof Date, "recordHeartbeat must set a real timestamp");
  const online = await getOnlinePlayerIdSet(["player-a"]);
  assert.ok(online.has("player-a"));
});

// 2 — stale heartbeat => offline.
test("2: a heartbeat older than the online window is considered offline", () => {
  const stale = new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS - 5_000);
  assert.equal(isOnline(stale), false);
});

test("2b: a player who has never sent a heartbeat (null lastSeenAt) is offline", async () => {
  assert.equal(isOnline(null), false);
  const online = await getOnlinePlayerIdSet(["player-a"]);
  assert.equal(online.has("player-a"), false);
});

test("2c: a stale heartbeat written directly to the profile is resolved as offline by getOnlinePlayerIdSet", async () => {
  seedPlayerProfile({ id: "player-stale", lastSeenAt: new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS - 5_000) });
  const online = await getOnlinePlayerIdSet(["player-stale"]);
  assert.equal(online.has("player-stale"), false);
});

// 3 — Global Chat shows green/gray correctly.
test("3: (source) Global Chat renders OnlineStatusDot next to each message's sender, driven by the row's own isOnline field", () => {
  assert.ok(globalChatWindowSrc.includes("OnlineStatusDot"));
  assert.match(globalChatWindowSrc, /<OnlineStatusDot isOnline=\{message\.isOnline\}\s*\/>/);
});

test("3b: getRecentGlobalChatMessages resolves each sender's isOnline correctly (green for a fresh heartbeat, gray for none)", async () => {
  await recordHeartbeat("player-a");
  // player-b never sends a heartbeat — stays offline.
  await sendGlobalChatMessage("player-a", "שלום");
  await sendGlobalChatMessage("player-b", "היי");

  const messages = await getRecentGlobalChatMessages();
  const fromA = messages.find((m) => m.playerDisplayName === "אביב");
  const fromB = messages.find((m) => m.playerDisplayName === "נועה");
  assert.equal(fromA?.isOnline, true, "player-a has a fresh heartbeat and must show as online");
  assert.equal(fromB?.isOnline, false, "player-b has never sent a heartbeat and must show as offline");
});

// 4 — Friends Bar shows green/gray correctly.
test("4: (source) FriendsBar renders OnlineStatusDot on each friend's avatar, driven by the friend's own isOnline field", () => {
  assert.ok(friendsBarSrc.includes("OnlineStatusDot"));
  assert.match(friendsBarSrc, /<OnlineStatusDot\s+isOnline=\{friend\.isOnline\}/);
});

test("4b: (source) OnlineStatusDot itself renders bright green when online and plain gray when offline", () => {
  assert.match(statusDotSrc, /bg-emerald-400 shadow-\[/, "online must use a bright green fill");
  assert.ok(statusDotSrc.includes('"bg-slate-500"'), "offline must use the plain gray fill");
});

// ONLINE STATUS DOT — VISUAL CHANGE. Glowing online dot, non-glowing gray
// offline dot, reused as-is by both Global Chat and the Friends Bar (no
// duplicated dot styling in either feature).
test("4d: (source) the online branch carries a two-layer green box-shadow glow (a bright tight ring plus a softer wide halo), and the offline branch carries no shadow at all", () => {
  assert.match(
    statusDotSrc,
    /isOnline\s*\n\s*\?\s*"bg-emerald-400 shadow-\[0_0_3px_1px_rgba\(52,211,153,0\.9\),0_0_8px_3px_rgba\(52,211,153,0\.5\)\]"\s*\n\s*:\s*"bg-slate-500"/,
    "the ternary must exactly pair a glowing bright-green online class with a plain, shadow-free gray offline class"
  );
});

test("4f: (source) neither Global Chat nor the Friends Bar defines its own status-dot styling — both only ever pass isOnline through to the one shared OnlineStatusDot component", () => {
  for (const src of [globalChatWindowSrc, friendsBarSrc]) {
    assert.ok(!src.includes("bg-emerald"), "must never re-implement the online fill color locally");
    assert.ok(!src.includes("shadow-[0_0_"), "must never re-implement the glow locally");
  }
});

test("4c: getFriendsAndRequests resolves each friend's isOnline correctly (green for a fresh heartbeat, gray for a stale one)", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  seedFriendship({ requesterId: "player-a", addresseeId: "player-c", status: "accepted" });
  await recordHeartbeat("player-b");
  await recordHeartbeat("player-c");
  // Manually push player-c's own heartbeat outside the online window.
  seedPlayerProfile({ id: "player-c", lastSeenAt: new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS - 5_000) });

  const view = await getFriendsAndRequests("player-a");
  const friendB = view.friends.find((f) => f.playerId === "player-b");
  const friendC = view.friends.find((f) => f.playerId === "player-c");
  assert.equal(friendB?.isOnline, true, "a friend with a fresh heartbeat must show as online");
  assert.equal(friendC?.isOnline, false, "a friend whose heartbeat has gone stale must show as offline");
});

// 5 — Home count includes only online authenticated players.
test("5: getOnlinePlayerCount counts only players within the online window — never offline or never-seen players", async () => {
  await recordHeartbeat("player-a");
  await recordHeartbeat("player-b");
  // player-c never sends a heartbeat.
  const count = await getOnlinePlayerCount();
  assert.equal(count, 2);
});

test("5b: a stale heartbeat is excluded from the online count", async () => {
  await recordHeartbeat("player-a");
  seedPlayerProfile({ id: "player-b", lastSeenAt: new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS - 5_000) });
  const count = await getOnlinePlayerCount();
  assert.equal(count, 1);
});

test("5c: (source) the Home online-count action requires a real session before returning a count — never counts an unauthenticated caller", () => {
  const presenceActionsCode = presenceActionsSrc;
  const getOnlineCountBody = presenceActionsCode.slice(presenceActionsCode.indexOf("export async function getOnlineCountAction"));
  assert.match(getOnlineCountBody, /if \(!session\) return 0;/);
});

// 6 — heartbeat does not interfere with battle lock/chat/friends logic.
test("6: (source) the heartbeat never touches battle-lock, chat, or friends state — it is a fully independent primitive", () => {
  for (const src of [heartbeatSrc, presenceActionsSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
    assert.ok(!src.includes("global-chat"), "must never import/call anything from the chat feature");
    assert.ok(!src.includes("friendship.service") && !src.includes("private-chat.service"), "must never import/call anything from the friends feature's own services");
  }
});

test("6b: (source) PresenceHeartbeat only ever calls sendHeartbeatAction on a fixed interval — never on render, click, or scroll", () => {
  assert.ok(heartbeatSrc.includes("setInterval"));
  assert.ok(!heartbeatSrc.includes("onClick"), "must never be wired to a click handler");
  assert.ok(!heartbeatSrc.includes("onScroll"), "must never be wired to a scroll handler");
});

test("6c: (source) the heartbeat is mounted exactly once at the (game) layout level, as a sibling of the other layout-level watchers", () => {
  assert.match(layoutSrc, /<PresenceHeartbeat\s*\/>/);
});

// SINGLE SOURCE OF TRUTH — the "60 seconds" window and the online decision
// itself must never be duplicated anywhere else.
test("7: (source) no duplicated online-window literal exists outside presence.config.ts — every consumer imports isOnline/getOnlinePlayerIdSet/getOnlinePlayerCount instead of reimplementing the check", () => {
  assert.match(presenceConfigSrc, /PRESENCE_ONLINE_WINDOW_MS = 60_000/);
  for (const src of [heartbeatSrc, presenceActionsSrc, globalChatWindowSrc, friendsBarSrc, statusDotSrc]) {
    assert.ok(!src.includes("60000") && !src.includes("60_000"), "the online window must never be hardcoded a second time outside presence.config.ts");
  }
});

// IMMEDIATE OFFLINE ON LOGOUT — behavioral coverage for markOffline itself,
// plus source-level coverage of logoutAction's wiring (a real end-to-end
// call would require mocking better-auth's own signOut/session machinery,
// which every other auth.actions test in this codebase already avoids —
// same "no React-render/DOM harness, no auth-mocking harness" convention).

// 8 — explicit logout -> offline immediately.
test("8: markOffline actually clears lastSeenAt back to null, and the player is then resolved as offline", async () => {
  await recordHeartbeat("player-a");
  assert.equal((await getOnlinePlayerIdSet(["player-a"])).has("player-a"), true, "sanity check: the player is online before markOffline runs");

  await markOffline("player-a");

  const row = getPlayerProfileRow("player-a");
  assert.equal(row?.lastSeenAt, null, "markOffline must clear lastSeenAt back to null, not merely an old timestamp");
  assert.equal((await getOnlinePlayerIdSet(["player-a"])).has("player-a"), false, "the player must be resolved as offline immediately, with no window to wait out");
});

test("8b: a player marked offline by logout is immediately excluded from the online count", async () => {
  await recordHeartbeat("player-a");
  await recordHeartbeat("player-b");
  assert.equal(await getOnlinePlayerCount(), 2);

  await markOffline("player-a");

  assert.equal(await getOnlinePlayerCount(), 1, "the logged-out player must drop out of the Home online count on the very next read, no heartbeat-timeout wait");
});

test("8c: (source) logoutAction resolves the current session/profile and calls markOffline BEFORE auth.api.signOut runs, using only the session-resolved profile id — never a client-supplied one", () => {
  const fnBody = authActionsSrc.slice(authActionsSrc.indexOf("export async function logoutAction"));
  const sessionIndex = fnBody.indexOf("getCurrentSession()");
  const profileIndex = fnBody.indexOf("getPlayerProfile(session.user.id)");
  const markOfflineIndex = fnBody.indexOf("markOffline(profile.id)");
  const signOutIndex = fnBody.indexOf("auth.api.signOut(");
  assert.ok(
    sessionIndex >= 0 && profileIndex > sessionIndex && markOfflineIndex > profileIndex && signOutIndex > markOfflineIndex,
    "the order must be: resolve session -> resolve profile -> markOffline -> signOut, so the session is still valid when presence is written"
  );
  assert.ok(!fnBody.includes("markOffline(") || fnBody.includes("markOffline(profile.id)"), "must only ever mark the session's own resolved profile offline, never any client-supplied id");
});

test("8d: (source) the presence write in logoutAction is wrapped in a try/catch, so a failure there can never block sign-out — auth.api.signOut and redirect always run", () => {
  const fnBody = authActionsSrc.slice(authActionsSrc.indexOf("export async function logoutAction"));
  const tryIndex = fnBody.indexOf("try {");
  const markOfflineIndex = fnBody.indexOf("markOffline(profile.id)");
  const catchIndex = fnBody.indexOf("} catch");
  const signOutIndex = fnBody.indexOf("auth.api.signOut(");
  const redirectIndex = fnBody.indexOf('redirect("/")');
  assert.ok(tryIndex >= 0 && markOfflineIndex > tryIndex && catchIndex > markOfflineIndex, "markOffline must be inside the try block");
  assert.ok(signOutIndex > catchIndex && redirectIndex > signOutIndex, "signOut and the final redirect must sit AFTER the catch, outside the try — unconditional regardless of the presence write's outcome");
});

// 9 — unexpected disconnect (never logging out) still relies purely on the
// existing heartbeat timeout, untouched by this task.
test("9: (source) markOffline is called from exactly one place (logoutAction) — no other code path (heartbeat, chat, friends) ever marks a player offline early", () => {
  for (const src of [heartbeatSrc, presenceActionsSrc, globalChatWindowSrc, friendsBarSrc]) {
    assert.ok(!src.includes("markOffline"), "markOffline must never be called outside the explicit logout flow");
  }
  assert.ok(presenceServiceSrc.includes("export async function markOffline"), "markOffline must still exist as the one shared presence-service primitive logoutAction calls");
});
