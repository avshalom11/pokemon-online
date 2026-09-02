// BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT. Focused source-level
// coverage: no React-render/DOM harness exists in this project (see any
// *-presentation.test.ts file for the established convention) — checked
// the same way.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const bottomDockSrc = fs.readFileSync("components/layout/BottomDock.tsx", "utf8");
const layoutContextSrc = fs.readFileSync("features/chat/context/global-chat-bar-layout-context.tsx", "utf8");
const globalChatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const socialDockSrc = fs.readFileSync("features/friends/components/SocialDock.tsx", "utf8");
const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");

test("1: chat and Friends now share one row instead of Friends stacking above — BottomDock groups them, in chat-then-friends DOM order", () => {
  const providerOpen = layoutSrc.indexOf("<GlobalChatBarLayoutProvider>");
  const providerClose = layoutSrc.indexOf("</GlobalChatBarLayoutProvider>");
  const dockOpen = layoutSrc.indexOf("<BottomDock>");
  const dockClose = layoutSrc.indexOf("</BottomDock>");
  assert.ok(providerOpen >= 0 && dockOpen > providerOpen, "GlobalChatBarLayoutProvider must wrap BottomDock");
  assert.ok(dockClose > 0 && dockClose < providerClose, "BottomDock must close before its provider does");

  const chatIndex = layoutSrc.indexOf("<GlobalChatBar", dockOpen);
  const friendsIndex = layoutSrc.indexOf("<SocialDock>", dockOpen);
  assert.ok(chatIndex > dockOpen && chatIndex < dockClose, "GlobalChatBar must be rendered inside BottomDock");
  assert.ok(friendsIndex > chatIndex && friendsIndex < dockClose, "SocialDock must come AFTER GlobalChatBar inside BottomDock, so Friends lands to its right");
});

test("2: BottomDock is dir=ltr so DOM order maps directly to left/right, same convention SocialDock's own inner row already established", () => {
  assert.match(bottomDockSrc, /dir="ltr"/);
});

test("3: row mode reuses the exact shared sidebar state/width — never a second, independent guess", () => {
  assert.ok(bottomDockSrc.includes('import { useSidebarOpen } from "@/components/layout/sidebar-open-context";'));
  assert.ok(bottomDockSrc.includes('import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";'));
  assert.match(bottomDockSrc, /style=\{\{ right: isSidebarOpen \? SIDEBAR_PANEL_WIDTH_CSS : "0px" \}\}/);
  assert.ok(bottomDockSrc.includes("transition-[right] duration-200"), "must animate together with the sidebar's own transition timing");
});

test("4: sidebar closed — the row is centered/aligned exactly like the chat bar was before (same w-[85%] max-w-[1400px] box)", () => {
  assert.ok(bottomDockSrc.includes('className="mx-auto flex w-[85%] max-w-[1400px] items-end gap-3"'), "the row must reuse the same centered content-container sizing the minimized bar used alone before this ticket");
});

test("5: sidebar open — BottomDock's own row shifts/resizes left, exactly the same push behavior already established for the sidebar", () => {
  assert.match(bottomDockSrc, /right: isSidebarOpen \? SIDEBAR_PANEL_WIDTH_CSS : "0px"/);
});

test("6: outside row mode (Home, or an expanded chat panel), BottomDock is an inert pass-through — GlobalChatBar/SocialDock keep self-positioning exactly as before this ticket", () => {
  assert.ok(bottomDockSrc.includes("if (!isRowActive) {"));
  assert.ok(bottomDockSrc.includes("return <>{children}</>;"));
});

test("7: row-active condition is the single shared rule (!isHome && minimized), consistent across BottomDock and SocialDock", () => {
  assert.match(bottomDockSrc, /const isRowActive = !isHome && minimized;/);
  assert.ok(socialDockSrc.includes("if (!isHome && minimized) {"), "SocialDock must use the exact same row-active condition, not a re-derived one");
});

test("8: GlobalChatBarLayoutProvider is the one shared source of isHome/minimized/setMinimized — GlobalChatBar no longer owns this as purely local state", () => {
  assert.ok(layoutContextSrc.includes("export function GlobalChatBarLayoutProvider"));
  assert.ok(layoutContextSrc.includes("export function useGlobalChatBarLayout"));
  assert.ok(globalChatBarSrc.includes('import { useGlobalChatBarLayout } from "@/features/chat/context/global-chat-bar-layout-context";'));
  assert.ok(globalChatBarSrc.includes("const { isHome, minimized, setMinimized } = useGlobalChatBarLayout();"));
  assert.ok(!globalChatBarSrc.includes("usePathname"), "GlobalChatBar must no longer compute isHome/route-tracking itself — that now lives solely in the shared provider");
});

test("9: GlobalChatBar's minimized bar is now a plain flex row slot (flex-1, min-w-0), not its own fixed/positioned element — BottomDock owns positioning in row mode", () => {
  const classIndex = globalChatBarSrc.indexOf('className="min-w-0 flex-1"');
  assert.ok(classIndex >= 0, 'the minimized bar must render as className="min-w-0 flex-1"');
  const minimizedJsx = globalChatBarSrc.slice(classIndex, globalChatBarSrc.indexOf("</div>", classIndex));
  assert.ok(!minimizedJsx.includes("fixed"), "the minimized bar's own rendered JSX must not self-position — only BottomDock (in row mode) positions it");
});

test("10: SocialDock's row-mode branch is a plain flex grouping with no positioning of its own", () => {
  const rowBranch = socialDockSrc.slice(socialDockSrc.indexOf("if (!isHome && minimized) {"), socialDockSrc.indexOf("if (!isHome && minimized) {") + 300);
  assert.ok(rowBranch.includes('className="flex flex-row items-end gap-3"'));
  assert.ok(!rowBranch.includes("fixed"), "row mode must never self-position — BottomDock already supplies the one fixed wrapper");
});

test("11: SocialDock's standalone branch (Home / expanded chat) is still self-fixed and right-4/sidebar-aware; bottom clearance now differs by case (CHAT/FRIENDS OVERLAP FIX) instead of always reusing the collapsed bar's height", () => {
  assert.match(socialDockSrc, /className="fixed right-4[^"]*"/);
  assert.match(socialDockSrc, /const chatClearanceVar = isHome \? "var\(--app-chat-bar-height\)" : "var\(--app-chat-panel-height\)";/);
  assert.match(socialDockSrc, /bottom: `calc\(\$\{chatClearanceVar\} \+ 1rem\)`/);
});

test("12: chat/friends functionality itself is untouched by this ticket — same useGlobalChat hook, same FriendsDataProvider-backed FriendsBar, no new polling introduced", () => {
  assert.ok(globalChatBarSrc.includes("useGlobalChat("), "must still use the one shared chat hook");
  assert.ok(!bottomDockSrc.includes("useGlobalChat(") && !bottomDockSrc.includes("useFriendsData"), "BottomDock is purely a layout wrapper — it must never touch chat/friends data itself");
});
