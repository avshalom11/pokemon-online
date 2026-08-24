// GLOBAL CHAT — HOME EMBED + AUTO-MINIMIZE ELSEWHERE. Focused coverage for
// this UI/layout-only follow-up. The route-driven collapse decision is a
// pure function (features/chat/utils/route-chat-visibility.ts), so it gets
// real unit tests, not just source greps; everything else that's
// component-level (Home's own default, the overlay's default, the manual
// expand control) is checked at the source level — this project's
// established "no React-render/DOM harness" convention (see any
// *-boundary.test.ts file, or features/chat/global-chat.test.ts's own 12/13
// checks).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import { isHomePathname, shouldForceCollapseOnRouteChange } from "@/features/chat/utils/route-chat-visibility";
import { resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const homeContentSrc = fs.readFileSync("features/home/components/HomeContent.tsx", "utf8");
const homeChatPanelSrc = fs.readFileSync("features/chat/components/HomeChatPanel.tsx", "utf8");
const chatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const chatBarLayoutContextSrc = fs.readFileSync("features/chat/context/global-chat-bar-layout-context.tsx", "utf8");
const homeDataServiceSrc = fs.readFileSync("features/home/services/home-data.service.ts", "utf8");

// 1: Home renders chat expanded/embedded.
test("1: Home renders the chat embedded in its own page content, expanded by default", () => {
  assert.ok(homeContentSrc.includes("HomeChatPanel"), "HomeContent must render HomeChatPanel as part of the page");
  assert.ok(homeDataServiceSrc.includes("globalChatMessages"), "Home's own view data must carry the chat's initial messages");
  assert.match(
    homeChatPanelSrc,
    /const \[minimized, setMinimized\] = useState\(false\)/,
    "HomeChatPanel must default to expanded (minimized: false) on every mount"
  );
  // Embedded, not a fixed overlay — must not reuse the overlay's own
  // fixed-positioning classes.
  assert.ok(!homeChatPanelSrc.includes("fixed inset-x-0 bottom-0"), "the embedded Home panel must not be a fixed bottom overlay");
});

// 2 + 3: route-driven default — pure logic (see route-chat-visibility.ts).
test("2: leaving Home for any other page forces the overlay bar to collapse", () => {
  assert.equal(shouldForceCollapseOnRouteChange("/home", "/map"), true);
  assert.equal(shouldForceCollapseOnRouteChange("/home", "/gyms"), true);
  assert.equal(shouldForceCollapseOnRouteChange("/home", "/profile/someone"), true);
});

test("3: non-Home pages default collapsed — navigating between two non-Home pages never forces a reset, and returning to Home never forces the overlay open (Home renders its own panel instead)", () => {
  assert.equal(shouldForceCollapseOnRouteChange("/map", "/gyms"), false, "two non-Home pages must never fight a manual expand");
  assert.equal(shouldForceCollapseOnRouteChange("/leagues", "/inventory"), false);
  assert.equal(shouldForceCollapseOnRouteChange("/map", "/home"), false, "arriving at Home is handled by the overlay rendering null, not a forced collapse");
  assert.equal(isHomePathname("/home"), true);
  assert.equal(isHomePathname("/map"), false);
});

test("3b: (source) the overlay bar defaults to collapsed and renders nothing on Home", () => {
  // BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT moved this state (and its
  // route-driven collapse logic) out of GlobalChatBar.tsx itself and into
  // the shared GlobalChatBarLayoutProvider, so SocialDock can read the same
  // live value — see that module's own doc comment.
  assert.match(chatBarLayoutContextSrc, /const \[minimized, setMinimized\] = useState\(true\)/, "the shared layout context must default to collapsed");
  assert.match(chatBarSrc, /if \(isHome\) return null/, "the overlay bar must render nothing on Home — HomeChatPanel is the only chat surface there");
  // Checks actual USAGE (window.localStorage.getItem/setItem), not a
  // blanket "localStorage" substring ban — this file's own doc comment
  // legitimately discusses its deliberate absence in prose.
  assert.ok(!chatBarSrc.includes("window.localStorage"), "an old persisted value must never be able to force the bar open on load");
  assert.ok(!chatBarLayoutContextSrc.includes("window.localStorage"), "the shared layout context must not persist this either");
});

// 4: user can expand on non-Home pages.
test("4: (source) the overlay bar's compact state exposes a manual expand control", () => {
  assert.match(chatBarSrc, /onClick=\{\(\) => setMinimized\(false\)\}/, "the collapsed bar must let the player manually expand it");
});

// 5: chat logic/polling unchanged — the shared hook still drives both
// presentations with the exact same mechanics (poll interval, cooldown/
// validation error labels, optimistic-merge dedup), and the underlying
// service/DB behavior (untouched by this ticket) still round-trips
// correctly end to end.
const useGlobalChatSrc = fs.readFileSync("features/chat/hooks/use-global-chat.ts", "utf8");

test("5a: (source) both chat presentations consume the one shared useGlobalChat hook — no duplicated poll/send logic", () => {
  assert.ok(chatBarSrc.includes("useGlobalChat("), "GlobalChatBar must use the shared hook");
  assert.ok(homeChatPanelSrc.includes("useGlobalChat("), "HomeChatPanel must use the shared hook");
  assert.ok(useGlobalChatSrc.includes("GLOBAL_CHAT_POLL_INTERVAL_MS"), "the shared hook must still drive polling off the unchanged config constant");
  assert.ok(useGlobalChatSrc.includes("mergeWithFresh"), "the shared hook must still keep the existing optimistic-merge/dedup logic");
});

test("5b: chat send/read/cap/cooldown behavior is unchanged end to end (service layer untouched by this ticket)", async () => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1", displayName: "אביב" });

  const sent = await sendGlobalChatMessage("player-1", "  שלום  ");
  assert.equal(sent.ok, true);
  assert.equal(sent.ok && sent.message.message, "שלום", "trimming behavior is unchanged");

  const recent = await getRecentGlobalChatMessages();
  assert.equal(recent.length, 1);
  assert.equal(recent[0]?.playerDisplayName, "אביב");

  const empty = await sendGlobalChatMessage("player-1", "   ");
  assert.deepEqual(empty, { ok: false, error: "empty" }, "empty-message rejection is unchanged");
});
