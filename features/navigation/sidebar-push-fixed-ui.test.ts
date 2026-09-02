// RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. Focused source-level
// coverage: no React-render/DOM harness exists in this project (see any
// *-presentation.test.ts / *-ux.test.ts file for the established
// convention) — checked the same way.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const gameSidebarSrc = fs.readFileSync("components/layout/GameSidebar.tsx", "utf8");
const sidebarContextSrc = fs.readFileSync("components/layout/sidebar-open-context.tsx", "utf8");
const socialDockSrc = fs.readFileSync("features/friends/components/SocialDock.tsx", "utf8");
const globalChatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
const gameLayoutConstSrc = fs.readFileSync("lib/layout/gameLayout.ts", "utf8");

test("1: the sidebar's real width lives as one shared constant, reused by GameSidebar, SocialDock, and GlobalChatBar — never a second hardcoded guess", () => {
  assert.match(gameLayoutConstSrc, /export const SIDEBAR_PANEL_WIDTH_CSS = "min\(18rem, 85vw\)";/);
  assert.ok(gameSidebarSrc.includes('import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";'));
  assert.ok(socialDockSrc.includes('import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";'));
  assert.ok(globalChatBarSrc.includes('import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";'));
  assert.ok(!gameSidebarSrc.includes('const SIDEBAR_PANEL_WIDTH_CSS ='), "GameSidebar must no longer define its own local copy");
});

test("2: the sidebar's open/closed state is lifted into one shared context — GameSidebar, SocialDock, and GlobalChatBar all read the same value", () => {
  assert.ok(sidebarContextSrc.includes("export function SidebarOpenProvider"));
  assert.ok(sidebarContextSrc.includes("export function useSidebarOpen"));
  assert.ok(gameSidebarSrc.includes('import { useSidebarOpen } from "@/components/layout/sidebar-open-context";'));
  assert.ok(gameSidebarSrc.includes("const { isOpen, setIsOpen } = useSidebarOpen();"));
  assert.ok(socialDockSrc.includes("const { isOpen } = useSidebarOpen();"));
  assert.ok(globalChatBarSrc.includes("useSidebarOpen();"));
  // GameSidebar must no longer own a second, independent copy of this state
  // — the localStorage hydration now lives solely in SidebarOpenProvider.
  assert.ok(!gameSidebarSrc.includes("OPEN_STORAGE_KEY"), "GameSidebar must not still read/write the persisted open state itself");
  assert.ok(sidebarContextSrc.includes('const OPEN_STORAGE_KEY = "game-sidebar-open";'), "the persisted key must still exist, just centralized in the provider");
});

test("3: SidebarOpenProvider actually wraps GameSidebar, GlobalChatBar, and SocialDock in the real layout", () => {
  const providerOpen = layoutSrc.indexOf("<SidebarOpenProvider>");
  const providerClose = layoutSrc.indexOf("</SidebarOpenProvider>");
  assert.ok(providerOpen >= 0 && providerClose > providerOpen, "SidebarOpenProvider must actually be mounted");
  for (const marker of ["<GameSidebar", "<GlobalChatBar", "<SocialDock>"]) {
    const index = layoutSrc.indexOf(marker);
    assert.ok(index > providerOpen && index < providerClose, `${marker} must be rendered inside SidebarOpenProvider`);
  }
});

test("4: sidebar closed — SocialDock keeps its exact prior right-4 positioning class; bottom clearance moved into inline style (CHAT/FRIENDS OVERLAP FIX, features/chat/bottom-dock-friends-beside-chat.test.ts's own test 11) since it now varies by Home vs. expanded-chat instead of always being the same class", () => {
  assert.match(socialDockSrc, /className="fixed right-4[^"]*"/, "the closed-state class must still carry the original right-4 offset, pixel-identical to before");
  assert.match(socialDockSrc, /bottom: `calc\(\$\{chatClearanceVar\} \+ 1rem\)`/);
  assert.match(socialDockSrc, /\.\.\.\(isOpen \? \{ right: `calc\(\$\{SIDEBAR_PANEL_WIDTH_CSS\} \+ 1rem\)` \} : \{\}\)/, "only an open sidebar may override the right offset inline");
});

test("5: sidebar open — SocialDock shifts left by the sidebar's own shared width, with a transition matching the sidebar's own 200ms", () => {
  assert.ok(socialDockSrc.includes("transition-[right] duration-200"), "must animate together with the sidebar's own transition timing");
  assert.ok(gameSidebarSrc.includes("transition-[right] duration-200"), "sanity: the sidebar toggle button itself uses this same timing");
  assert.ok(gameSidebarSrc.includes("transition-transform duration-200"), "sanity: the sidebar aside panel itself uses this same timing");
});

test("6: the expanded Global Chat panel shifts its right edge left of the sidebar while open, never just raising z-index over it", () => {
  // BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT moved the minimized bar's
  // own sidebar-aware positioning (and its centered-width box) out of
  // GlobalChatBar.tsx and into the shared BottomDock wrapper — see that
  // module's own coverage below. Only the expanded panel still self-
  // positions here, unchanged by that ticket.
  assert.ok(globalChatBarSrc.includes("const rightInsetStyle = { right: isSidebarOpen ? SIDEBAR_PANEL_WIDTH_CSS : \"0px\" };"));
  const expandedReturn = globalChatBarSrc.slice(globalChatBarSrc.lastIndexOf("return (\n    <div"));
  assert.ok(expandedReturn.includes('className={`fixed left-0 bottom-0 z-40 flex h-72'));
  assert.ok(expandedReturn.includes("style={rightInsetStyle}"));
});

test("7: nothing solves this by only raising z-index — no z-index change was introduced by this ticket's files", () => {
  assert.ok(gameSidebarSrc.includes("z-30") && gameSidebarSrc.includes("z-40"), "sidebar's own existing z-index values are untouched");
  assert.ok(globalChatBarSrc.includes("z-40"), "GlobalChatBar's own existing z-index is untouched");
  assert.ok(socialDockSrc.includes("z-[45]"), "SocialDock's own existing z-index is untouched");
});
