// SITE RENDER PERFORMANCE — focused coverage for this task's own 3
// optimizations (FriendsDataProvider rerender bailout + memoized context
// value, Home router.refresh() gated to genuine back/forward only, hidden
// -tab polling pause/resume). Pure-logic pieces (the equality helpers) are
// tested directly with real assertions; UI-wiring facts are checked at the
// source level — this project's established "no React-render/DOM harness"
// convention (see e.g. features/friends/friends-quick-actions.test.ts,
// features/presence/presence.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { friendsEqual, incomingRequestsEqual } from "@/features/friends/utils/friends-equality";
import type { FriendSummary, PendingFriendRequestView } from "@/features/friends/types";

const friendsDataContextSrc = fs.readFileSync("features/friends/context/friends-data-context.tsx", "utf8");
const usePageVisibleSrc = fs.readFileSync("lib/hooks/use-page-visible.ts", "utf8");
const refreshHomeOnMountSrc = fs.readFileSync("features/home/components/RefreshHomeOnMount.tsx", "utf8");
const backForwardNavSrc = fs.readFileSync("features/home/utils/back-forward-navigation.ts", "utf8");
const popupWatcherSrc = fs.readFileSync("features/friends/components/PrivateMessagePopupWatcher.tsx", "utf8");
const useGlobalChatSrc = fs.readFileSync("features/chat/hooks/use-global-chat.ts", "utf8");
const usePrivateChatSrc = fs.readFileSync("features/friends/hooks/use-private-chat.ts", "utf8");
const onlineStatSrc = fs.readFileSync("features/home/components/OnlinePlayerCountStat.tsx", "utf8");
const presenceHeartbeatSrc = fs.readFileSync("features/presence/components/PresenceHeartbeat.tsx", "utf8");

function makeFriend(overrides: Partial<FriendSummary> = {}): FriendSummary {
  return { playerId: "player-a", displayName: "אביב", username: "aviv", isOnline: false, ...overrides };
}

function makeRequest(overrides: Partial<PendingFriendRequestView> = {}): PendingFriendRequestView {
  return { requestId: "req-1", requesterPlayerId: "player-b", requesterDisplayName: "נועה", requesterUsername: "noa", ...overrides };
}

// 1 — unchanged poll data must be recognized as equal (so refresh() can
// bail out of the setState call and never touch consumers).
test("1: friendsEqual treats two content-identical (but not reference-identical) arrays as equal", () => {
  const a = [makeFriend()];
  const b = [makeFriend()];
  assert.notEqual(a, b, "sanity check: these are two distinct array instances, same as a fresh server read every poll tick");
  assert.equal(friendsEqual(a, b), true);
});

test("1b: incomingRequestsEqual treats two content-identical (but not reference-identical) arrays as equal", () => {
  const a = [makeRequest()];
  const b = [makeRequest()];
  assert.equal(incomingRequestsEqual(a, b), true);
});

test("1c: both equality checks treat two empty arrays as equal (the common 'no friends/requests yet' case)", () => {
  assert.equal(friendsEqual([], []), true);
  assert.equal(incomingRequestsEqual([], []), true);
});

// 2 — genuinely changed data must still be detected as different, so a real
// change still updates every consumer normally.
test("2: friendsEqual detects an isOnline flip (the field most likely to silently change between polls)", () => {
  const a = [makeFriend({ isOnline: false })];
  const b = [makeFriend({ isOnline: true })];
  assert.equal(friendsEqual(a, b), false);
});

test("2b: friendsEqual detects a friend being added or removed", () => {
  const a = [makeFriend({ playerId: "player-a" })];
  const b = [makeFriend({ playerId: "player-a" }), makeFriend({ playerId: "player-c", displayName: "דני", username: "dani" })];
  assert.equal(friendsEqual(a, b), false);
  assert.equal(friendsEqual(b, a), false);
});

test("2c: incomingRequestsEqual detects a new incoming request appearing", () => {
  const a: PendingFriendRequestView[] = [];
  const b = [makeRequest()];
  assert.equal(incomingRequestsEqual(a, b), false);
});

test("2d: incomingRequestsEqual detects a request disappearing (accepted/declined by another client)", () => {
  const a = [makeRequest()];
  const b: PendingFriendRequestView[] = [];
  assert.equal(incomingRequestsEqual(a, b), false);
});

// 3 — refresh() actually uses the equality helpers via the setState
// functional-updater "return the same reference" bailout pattern (the only
// thing that makes React actually skip the rerender), not merely computing
// them and discarding the result.
test("3: (source) refresh() bails out of setFriends/setIncomingRequests by returning the SAME reference when the fresh read is equivalent", () => {
  const refreshBody = friendsDataContextSrc.slice(
    friendsDataContextSrc.indexOf("const refresh = useCallback"),
    friendsDataContextSrc.indexOf("useEffect(() => {", friendsDataContextSrc.indexOf("const refresh = useCallback"))
  );
  assert.match(
    refreshBody,
    /setFriends\(\(current\) => \(friendsEqual\(current, fresh\.friends\) \? current : fresh\.friends\)\)/,
    "must return `current` unchanged (not a new equivalent array) when friendsEqual says nothing changed"
  );
  assert.match(
    refreshBody,
    /setIncomingRequests\(\(current\) => \(incomingRequestsEqual\(current, fresh\.incomingRequests\) \? current : fresh\.incomingRequests\)\)/,
    "must return `current` unchanged (not a new equivalent array) when incomingRequestsEqual says nothing changed"
  );
});

// 4 — the context value itself must be memoized, or an unrelated render
// could still hand consumers a new object even when friends/incomingRequests
// didn't change.
test("4: (source) the context value is wrapped in useMemo, keyed on friends/incomingRequests/refresh/respondToRequest/removeFriend", () => {
  assert.match(
    friendsDataContextSrc,
    /const value = useMemo<FriendsDataContextValue>\(\s*\(\) => \(\{ friends, incomingRequests, refresh, respondToRequest, removeFriend \}\),\s*\[friends, incomingRequests, refresh, respondToRequest, removeFriend\]\s*\)/,
    "the provider's context value must be memoized on exactly the pieces that can actually change"
  );
  assert.match(friendsDataContextSrc, /<FriendsDataContext\.Provider value=\{value\}>/, "the provider must render the memoized value, not a fresh object literal");
});

test("4b: (source) refresh/respondToRequest/removeFriend are each wrapped in useCallback, so their identities stay stable across unrelated rerenders", () => {
  assert.match(friendsDataContextSrc, /const refresh = useCallback\(/);
  assert.match(friendsDataContextSrc, /const respondToRequest = useCallback\(/);
  assert.match(friendsDataContextSrc, /const removeFriend = useCallback\(/);
});

// 5 — hidden tab pauses polling; becoming visible again resumes with one
// immediate refresh, without adding a second immediate refresh on ordinary
// first mount.
test("5: (source) usePageVisible is a real document.visibilityState subscription via useSyncExternalStore, not a static/always-true stub", () => {
  assert.match(usePageVisibleSrc, /useSyncExternalStore/);
  assert.match(usePageVisibleSrc, /addEventListener\("visibilitychange"/);
  assert.match(usePageVisibleSrc, /document\.visibilityState === "visible"/);
});

test("5b: (source) FriendsDataProvider's poll effect skips entirely while hidden, and fires one immediate refresh() on the transition back to visible (not on ordinary first mount)", () => {
  assert.ok(friendsDataContextSrc.includes("usePageVisible()"), "must read the shared visibility signal");
  assert.match(friendsDataContextSrc, /if \(!isVisible\) \{\s*wasHiddenRef\.current = true;\s*return;\s*\}/, "must skip setting up the interval entirely while hidden");
  assert.match(friendsDataContextSrc, /if \(wasHiddenRef\.current\) \{\s*wasHiddenRef\.current = false;\s*refresh\(\);\s*\}/, "must fire exactly one immediate refresh on resume, gated on having actually been hidden");
  assert.match(friendsDataContextSrc, /\}, \[isVisible, refresh\]\);/, "the poll effect must re-run when visibility changes");
});

test("5c: (source) PrivateMessagePopupWatcher's poll pauses while hidden and resumes via the same effect that already ran an immediate tick() on mount", () => {
  assert.ok(popupWatcherSrc.includes('import { usePageVisible } from "@/lib/hooks/use-page-visible";'));
  assert.match(popupWatcherSrc, /if \(!isPageVisible\) return;/);
  assert.match(popupWatcherSrc, /\}, \[isPageVisible\]\);/);
});

test("5d: (source) useGlobalChat's poll pauses while hidden (in addition to its existing 'only while expanded' gate) and resumes immediately", () => {
  assert.ok(useGlobalChatSrc.includes('import { usePageVisible } from "@/lib/hooks/use-page-visible";'));
  assert.match(useGlobalChatSrc, /if \(!active \|\| !isPageVisible\) return;/);
  assert.match(useGlobalChatSrc, /\}, \[active, isPageVisible\]\);/);
});

test("5e: (source) usePrivateChat's poll (the currently-open conversation) pauses while hidden and resumes immediately", () => {
  assert.ok(usePrivateChatSrc.includes('import { usePageVisible } from "@/lib/hooks/use-page-visible";'));
  assert.match(usePrivateChatSrc, /if \(!isPageVisible\) return;/);
  assert.match(usePrivateChatSrc, /\}, \[conversationId, isPageVisible\]\);/);
});

test("5f: (source) OnlinePlayerCountStat's poll pauses while hidden and fires one immediate refresh on resume, without an extra fetch on ordinary first mount", () => {
  assert.ok(onlineStatSrc.includes('import { usePageVisible } from "@/lib/hooks/use-page-visible";'));
  assert.match(onlineStatSrc, /if \(!isPageVisible\) \{\s*wasHiddenRef\.current = true;\s*return;\s*\}/);
  assert.match(onlineStatSrc, /if \(wasHiddenRef\.current\) \{\s*wasHiddenRef\.current = false;\s*tick\(\);\s*\}/);
});

test("5g: (source) PresenceHeartbeat is untouched by visibility pausing — a backgrounded tab must still count as online", () => {
  assert.ok(!presenceHeartbeatSrc.includes("usePageVisible"), "the heartbeat must keep sending on its fixed interval regardless of tab visibility");
  assert.match(presenceHeartbeatSrc, /}, \[\]\);/, "its effect must still run unconditionally, exactly as before this task");
});

// 6 — Home's router.refresh() only fires for a genuine back/forward
// restoration, never on ordinary forward navigation to Home.
test("6: (source) RefreshHomeOnMount no longer calls router.refresh() unconditionally — only inside the back/forward gate", () => {
  assert.ok(!/useEffect\(\(\) => \{\s*router\.refresh\(\);\s*\}, \[router\]\)/.test(refreshHomeOnMountSrc), "must not call router.refresh() on every ordinary mount");
  assert.match(
    refreshHomeOnMountSrc,
    /useEffect\(\(\) => \{\s*if \(consumePendingBackForwardNavigation\(\)\) \{\s*router\.refresh\(\);\s*\}\s*\}, \[router\]\);/,
    "router.refresh() must be gated behind a genuine back/forward check"
  );
  assert.ok(refreshHomeOnMountSrc.includes('import { consumePendingBackForwardNavigation } from "@/features/home/utils/back-forward-navigation";'));
});

test("6b: (source) back-forward-navigation.ts derives 'genuine back/forward' from a real popstate listener (never a heuristic on pathname/referrer)", () => {
  assert.match(backForwardNavSrc, /window\.addEventListener\("popstate", \(\) => \{\s*pendingBackForwardNavigation = true;\s*\}\);/);
});

test("6c: (source) consumePendingBackForwardNavigation reads-and-clears the flag, so one popstate only ever triggers exactly one refresh", () => {
  const fnBody = backForwardNavSrc.slice(backForwardNavSrc.indexOf("export function consumePendingBackForwardNavigation"));
  assert.match(fnBody, /if \(!pendingBackForwardNavigation\) return false;/);
  assert.match(fnBody, /pendingBackForwardNavigation = false;/);
  assert.match(fnBody, /return true;/);
});

// 7 — nothing else about friendship/notification/chat/battle-lock behavior
// changed by this task (carried over from friends-quick-actions.test.ts's
// own battle-lock isolation check, re-asserted here specifically against
// the files this task touched).
test("7: (source) none of this task's touched files read or modify ActiveBattleProvider/battle-lock state", () => {
  for (const src of [friendsDataContextSrc, popupWatcherSrc, useGlobalChatSrc, usePrivateChatSrc, onlineStatSrc, refreshHomeOnMountSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
  }
});

test("7b: (source) polling intervals themselves are untouched — still the exact same config constants, no new/changed literal cadence", () => {
  assert.ok(friendsDataContextSrc.includes("FRIENDS_DATA_POLL_INTERVAL_MS"));
  assert.ok(popupWatcherSrc.includes("POLL_INTERVAL_MS = 2500;"));
  assert.ok(useGlobalChatSrc.includes("GLOBAL_CHAT_POLL_INTERVAL_MS"));
  assert.ok(usePrivateChatSrc.includes("PRIVATE_CHAT_POLL_INTERVAL_MS"));
  assert.ok(onlineStatSrc.includes("PRESENCE_READ_POLL_INTERVAL_MS"));
});
