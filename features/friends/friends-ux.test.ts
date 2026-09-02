// FRIENDS + PRIVATE CHAT UX — focused coverage for this task's own
// presentation/wiring requirements. The backend (friendship.service.ts,
// private-chat.service.ts) is unchanged and already covered by
// friendship.test.ts/private-chat.test.ts; this file checks the UX layer
// this task actually changed. Most of these are source-level checks — this
// project's established convention for UI-wiring facts with no React-
// render/DOM harness (see e.g. features/chat/global-chat.test.ts's own
// 12/13/14, or features/chat/global-chat-presentation.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
const profileContentSrc = fs.readFileSync("features/profile/components/ProfileContent.tsx", "utf8");
const profileFriendsSectionSrc = fs.readFileSync("features/friends/components/ProfileFriendsSection.tsx", "utf8");
const floatingWindowSrc = fs.readFileSync("features/friends/components/FloatingPrivateChatWindow.tsx", "utf8");
const contextSrc = fs.readFileSync("features/friends/context/private-chat-window-context.tsx", "utf8");
const globalChatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");

// 1 + 2 — pending requests AND accepted friends appear in the player's own
// Profile (data correctness for both is already proven by
// friendship.test.ts's own getFriendsAndRequests test; this checks the
// actual wiring puts that data on the Profile page). UPDATED by FRIENDS
// QUICK ACTIONS: friends data is no longer fetched per-profile-page — it's
// seeded once at the (game) layout level into the shared
// FriendsDataProvider (friends-data-context.tsx), which is what keeps this
// section in sync with the notification bell/Friends bar/other-profile
// accept-decline without a page reload — see that provider's own doc
// comment.
test("1+2: the shared FriendsDataProvider (seeded at the layout level) feeds ProfileFriendsSection for the owner", () => {
  assert.ok(layoutSrc.includes("FriendsDataProvider"), "GameLayout must provide the shared friends-data context");
  assert.ok(layoutSrc.includes("getFriendsAndRequests"), "GameLayout must seed it with the real friends/requests");
  assert.match(profileContentSrc, /view\.isOwner\s*\?\s*<ProfileFriendsSection/, "the חברים section must only ever render for the profile OWNER");
  assert.ok(profileFriendsSectionSrc.includes("useFriendsData"), "ProfileFriendsSection must read from the shared context, not its own fetch");
  assert.ok(profileFriendsSectionSrc.includes("בקשות חברות"), "the pending-requests area must be present");
  assert.ok(profileFriendsSectionSrc.includes("החברים שלי"), "the confirmed-friends area must be present");
  assert.ok(profileFriendsSectionSrc.includes("אשר חברות") && profileFriendsSectionSrc.includes("לא מאשר"), "accept/decline controls must be present");
});

// 3 — the old standalone management page must not linger as a duplicate.
test("3: the old standalone /friends management page no longer exists", () => {
  assert.ok(!fs.existsSync("app/(game)/friends/page.tsx"), "the standalone Friends list page must be removed — Profile is now the one place");
});

// 4 — Open Chat does not navigate to a separate page.
test("4: (source) 'פתח צ׳אט' opens the floating window in place — it is never a navigation link", () => {
  assert.ok(profileFriendsSectionSrc.includes("פתח צ׳אט"));
  assert.ok(profileFriendsSectionSrc.includes("openChat("), "must call the shared context's openChat, not navigate");
  // Checks actual USAGE (an import of next/link, or a template literal
  // building a /friends/... href) rather than a blanket "/friends/"
  // substring ban — this file's own doc comment legitimately mentions the
  // old /friends page in prose.
  assert.ok(!profileFriendsSectionSrc.includes("next/link"), "must not import Link");
  assert.ok(!profileFriendsSectionSrc.includes("href={`/friends"), "must never build a /friends/[playerId] href");
  assert.ok(!fs.existsSync("app/(game)/friends/[playerId]/page.tsx"), "the old per-conversation page route must be removed");
});

// 5 — mounts from the shared game layout, exactly once.
test("5: (source) the floating private chat window is mounted exactly once, by the shared (game) layout", () => {
  assert.ok(layoutSrc.includes("PrivateChatWindowProvider"), "GameLayout must provide the shared private-chat context");
  assert.ok(layoutSrc.includes("FloatingPrivateChatWindow"), "GameLayout must render the floating window");

  // No page-level file should ALSO mount the provider/window — that would
  // create a second, competing instance instead of the one persistent
  // layout-level surface this feature requires.
  const pageFiles = fs.readdirSync("app/(game)", { recursive: true }).filter((entry) => typeof entry === "string" && entry.endsWith("page.tsx"));
  for (const file of pageFiles) {
    const src = fs.readFileSync(`app/(game)/${file}`, "utf8");
    assert.ok(!src.includes("PrivateChatWindowProvider"), `${file} must not mount its own PrivateChatWindowProvider`);
    assert.ok(!src.includes("FloatingPrivateChatWindow"), `${file} must not mount its own FloatingPrivateChatWindow`);
  }
});

// 6 — chat appears bottom-right (both states). As of FRIENDS UI —
// MINIMIZED CHAT POSITION + LIVE FRIEND REMOVAL SYNC, the floating window
// no longer positions itself at all — it's a plain flex child of the
// shared SocialDock, which is the one place bottom-right fixed
// positioning now lives (see SocialDock.tsx's own doc comment).
test("6: (source) the floating window is a plain SocialDock flex child in both minimized and expanded states, never self-positioned", () => {
  assert.ok(!floatingWindowSrc.includes("fixed bottom-"), "the floating window itself must never carry its own fixed bottom-right positioning");
  assert.ok(!floatingWindowSrc.includes("right-4"), "the floating window itself must never carry its own right offset");
  const dockSrc = fs.readFileSync("features/friends/components/SocialDock.tsx", "utf8");
  // CHAT/FRIENDS OVERLAP FIX moved the bottom offset from a static class
  // into an inline style (see features/chat/bottom-dock-friends-beside-chat.test.ts's
  // own test 11) — still exactly one shared place (SocialDock).
  assert.match(dockSrc, /className="fixed right-4/, "SocialDock must be the one place bottom-right fixed positioning lives");
  assert.match(dockSrc, /bottom: `calc\(\$\{chatClearanceVar\} \+ 1rem\)`/);
  const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
  const dockOpenIndex = layoutSrc.indexOf("<SocialDock>");
  const floatingIndex = layoutSrc.indexOf("<FloatingPrivateChatWindow");
  const dockCloseIndex = layoutSrc.indexOf("</SocialDock>");
  assert.ok(dockOpenIndex >= 0 && floatingIndex > dockOpenIndex && floatingIndex < dockCloseIndex, "FloatingPrivateChatWindow must be rendered inside SocialDock");
});

// 7 + 8 — minimize / restore.
test("7+8: (source) minimize and restore controls exist and toggle the shared context's isMinimized state", () => {
  assert.ok(contextSrc.includes("minimizeChat") && contextSrc.includes("restoreChat"));
  assert.ok(floatingWindowSrc.includes("onClick={restoreChat}"), "clicking the minimized tab must restore the conversation");
  assert.ok(floatingWindowSrc.includes("onClick={onMinimize}"), "the expanded header must expose a minimize button");
  // Minimizing must never clear activeConversation — only isMinimized.
  assert.match(contextSrc, /function minimizeChat\(\) \{\s*setIsMinimized\(true\);\s*\}/, "minimize must only ever flip isMinimized, never touch activeConversation");
});

// 9 — closing removes the window completely.
test("9: (source) closing clears the active conversation entirely (not just hiding it)", () => {
  assert.ok(floatingWindowSrc.includes("onClick={onClose}"));
  assert.match(contextSrc, /function closeChat\(\) \{\s*setActiveConversation\(null\);/, "close must clear activeConversation, not merely minimize");
});

// 10 — navigation does not destroy the active chat state.
test("10: (source) the private-chat state lives in a provider mounted once at the layout level, never remounted per page", () => {
  // Already partially covered by test 5 (single mount site) — this adds
  // the structural guarantee: the state itself (useState) lives inside
  // PrivateChatWindowProvider, a component the layout renders directly
  // around {children}, so client-side navigation between pages (which
  // only ever replaces {children}) can never remount it.
  assert.match(layoutSrc, /<PrivateChatWindowProvider>[\s\S]*\{children\}[\s\S]*<\/PrivateChatWindowProvider>/, "{children} must render INSIDE the provider, not the other way around");
});

// 11 — switching friends switches the SINGLE active window.
test("11: (source) opening a chat with a different friend replaces the single active window, never adds a second one", () => {
  assert.match(contextSrc, /activeConversation:\s*ActivePrivateConversation \| null/, "at most one active conversation can ever be tracked");
  assert.ok(!floatingWindowSrc.includes(".map("), "the floating window must never render a list/array of conversations");
  assert.ok(contextSrc.includes("setActiveConversation({"), "openChat must replace the active conversation via a plain object set, not append to a collection");
});

// 12 — Global Chat remains independent.
test("12: (source) Global Chat is untouched and has no dependency on Friends/Private Chat", () => {
  assert.ok(!globalChatBarSrc.includes("friends"), "GlobalChatBar must not reference the Friends/Private Chat feature");
  assert.ok(!globalChatBarSrc.includes("PrivateChat"), "GlobalChatBar must not reference Private Chat");
  // The dependency only ever runs the other way — Friends reuses Global
  // Chat's pure visual theme constants, never its logic.
  assert.ok(floatingWindowSrc.includes("@/features/chat/components/chat-theme"), "Private Chat may reuse Global Chat's theme constants only");
  assert.ok(!floatingWindowSrc.includes("global-chat.service") && !floatingWindowSrc.includes("global-chat.actions"), "Private Chat must never call into Global Chat's own service/actions");
});

// 13 — battle-lock state is untouched.
test("13: (source) Friends/Private Chat never reads or modifies ActiveBattleProvider/battle-lock state", () => {
  for (const src of [floatingWindowSrc, contextSrc, profileFriendsSectionSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
  }
});
