"use client";

import type { ReactNode } from "react";

import { useSidebarOpen } from "@/components/layout/sidebar-open-context";
import { useGlobalChatBarLayout } from "@/features/chat/context/global-chat-bar-layout-context";
import { useTutorialTarget } from "@/features/tutorial/context/tutorial-context";
import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";

// FRIENDS UI — MINIMIZED CHAT POSITION FIX. One shared fixed flex
// container anchored to the bottom-right corner, holding both floating
// social panels (Private Chat, then Friends Bar, in that DOM order) in
// natural flex flow instead of each independently self-positioning with
// its own hardcoded right-offset. This is what makes "the minimized chat
// tab sits immediately left of the Friends Bar, with a small clean gap"
// true automatically for EVERY combination of collapsed/expanded state on
// either panel: flexbox's own `gap` adapts to whatever each child's
// current rendered width actually is, so there is no separate rem-offset
// value to keep in sync per state.
//
// THE BUG THIS FIXES — the previous design gave the private-chat window a
// fixed `sm:right-[22rem]` offset, sized for the Friends Bar's EXPANDED
// panel width. Whenever the Friends Bar was collapsed instead (a small
// pill, nowhere near 22rem wide), that same fixed offset left a large,
// unrelated gap between the two — visually reading as "the minimized chat
// floats near the middle of the screen" (the real playtest bug this
// component was built to fix), even though the number itself was never
// actually a hardcoded viewport coordinate. Neither child now carries any
// right-offset of its own; only this dock does.
//
// dir="ltr" is deliberate (not "rtl"): with a plain, unreversed
// flex-direction: row, the FIRST DOM child renders on the left and the
// LAST on the right regardless of the app's own RTL content direction —
// each child's own internal content still renders RTL via its own
// dir="rtl" root (FriendsBar.tsx, FloatingPrivateChatWindow.tsx). Render
// Private Chat before Friends Bar as children so Friends Bar — required to
// be the right-most social element — is always the last, and therefore
// right-most, child. items-end aligns both panels' bottom edges so each
// grows upward independently regardless of the other's current height
// (a collapsed pill next to a tall expanded panel, or vice versa).
// RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. `right` shifts left by the
// sidebar's own real width (SIDEBAR_PANEL_WIDTH_CSS, the one shared
// constant GameSidebar.tsx's aside panel itself uses — never a second,
// independently-hardcoded guess) whenever it's open, so this dock — and
// everything docked inside it — never renders underneath the open sidebar.
// transition-[right] duration-200 matches the sidebar's own open/close
// transition (both its toggle button and aside panel use the same 200ms),
// so the two move together as one motion instead of one snapping ahead of
// the other.
//
// BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT — this dock has two
// mutually-exclusive presentations now, chosen by the same isHome/minimized
// values GlobalChatBar itself reads (via the shared
// GlobalChatBarLayoutProvider — see that module's own doc comment): (1) row
// mode, whenever there's an actual minimized bar to sit beside — then this
// is just a plain flex-row grouping, no positioning of its own, since the
// shared BottomDock wrapper (components/layout/BottomDock.tsx) already
// supplies ONE fixed, sidebar-aware, centered row for both this dock and
// the chat bar together; (2) the standalone stacked-above-chat position
// below, for the two cases that fall outside row mode — Home (no chat bar
// exists there at all) and an expanded chat panel. Those two cases now pick
// a DIFFERENT bottom clearance each (see CHAT/FRIENDS OVERLAP FIX below) —
// Home's is pixel-identical to before this dock existed, but an expanded
// panel's is not: it used to reuse Home's same clearance too, which was the
// bug (the panel is far taller than the collapsed bar Home's clearance was
// actually sized for, so this dock overlapped its bottom).
export function SocialDock({ children }: { children: ReactNode }) {
  const { isOpen } = useSidebarOpen();
  const { isHome, minimized } = useGlobalChatBarLayout();
  // GAME TUTORIAL — PHASE 1. Spotlights the whole dock (Friends bar +
  // private chat) regardless of which of the two mutually-exclusive
  // presentations below is currently rendering — the Friends stage never
  // requires a specific interaction (see tutorial-stages.config.ts's own
  // "friends" stage doc comment), only that the player notices this area.
  const friendsBarTargetRef = useTutorialTarget("friends-bar");

  if (!isHome && minimized) {
    return (
      <div ref={friendsBarTargetRef} dir="ltr" className="flex flex-row items-end gap-3">
        {children}
      </div>
    );
  }

  // CHAT/FRIENDS OVERLAP FIX — the remaining two cases both land here (Home,
  // and an EXPANDED chat panel on a non-Home page), and need different
  // bottom clearance: Home has no chat bar at all, so it keeps clearing only
  // the collapsed bar's height (--app-chat-bar-height) exactly as before;
  // an expanded panel is taller (GlobalChatBar's own h-72/sm:h-80), so this
  // dock must clear that instead (--app-chat-panel-height, same file) or it
  // physically overlaps the panel's own newest-message/composer area since
  // this dock's z-[45] sits above the chat panel's z-40.
  const chatClearanceVar = isHome ? "var(--app-chat-bar-height)" : "var(--app-chat-panel-height)";

  // Sidebar closed: right-4 (the class) applies untouched — pixel-identical
  // to this dock's prior positioning. Sidebar open: an inline `right`
  // override (which always wins over the utility class) shifts it left by
  // the sidebar's own width instead.
  return (
    <div
      ref={friendsBarTargetRef}
      dir="ltr"
      className="fixed right-4 z-[45] flex flex-row items-end gap-3 transition-[right] duration-200"
      style={{
        bottom: `calc(${chatClearanceVar} + 1rem)`,
        ...(isOpen ? { right: `calc(${SIDEBAR_PANEL_WIDTH_CSS} + 1rem)` } : {}),
      }}
    >
      {children}
    </div>
  );
}
