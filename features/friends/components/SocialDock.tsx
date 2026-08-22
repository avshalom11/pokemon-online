"use client";

import type { ReactNode } from "react";

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
export function SocialDock({ children }: { children: ReactNode }) {
  return (
    <div dir="ltr" className="fixed bottom-[calc(var(--app-chat-bar-height)+1rem)] right-4 z-[45] flex flex-row items-end gap-3">
      {children}
    </div>
  );
}
