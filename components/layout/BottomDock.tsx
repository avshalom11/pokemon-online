"use client";

import type { ReactNode } from "react";

import { useSidebarOpen } from "@/components/layout/sidebar-open-context";
import { useGlobalChatBarLayout } from "@/features/chat/context/global-chat-bar-layout-context";
import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";

// BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT. The one central place that
// decides whether the minimized Global Chat bar and the Friends/private-chat
// dock (SocialDock) share one bottom row, or each keep self-positioning
// exactly as they did before this ticket — rather than the two components
// each guessing at the other's layout independently.
//
// Row mode only applies when there's actually a minimized bar to sit next
// to: not on Home (GlobalChatBar renders nothing there — HomeChatPanel is
// the only chat surface) and not while the chat panel is expanded (left
// completely untouched by this ticket: GlobalChatBar keeps rendering that
// as its own full-width fixed panel, and SocialDock reverts to its original
// stacked-above position). Everywhere else this renders `children` as a
// plain pass-through Fragment — GlobalChatBar (expanded) and SocialDock
// both still own their own "fixed" positioning in that case, pixel-
// identical to before this ticket.
//
// In row mode, this owns the ONE fixed, sidebar-aware wrapper for the whole
// row (reusing the exact useSidebarOpen/SIDEBAR_PANEL_WIDTH_CSS pattern
// GlobalChatBar/SocialDock's own standalone positioning already
// established — never a second, independent copy of that logic), and the
// same centered w-[85%] max-w-[1400px] box the minimized bar used to center
// itself in alone (see GlobalChatBar's own prior "CENTERED WIDTH" ticket) —
// now centering the whole [chat][friends] row as one unit instead.
export function BottomDock({ children }: { children: ReactNode }) {
  const { isOpen: isSidebarOpen } = useSidebarOpen();
  const { isHome, minimized } = useGlobalChatBarLayout();
  const isRowActive = !isHome && minimized;

  if (!isRowActive) {
    return <>{children}</>;
  }

  return (
    <div
      dir="ltr"
      className="fixed left-0 bottom-0 z-40 transition-[right] duration-200"
      style={{ right: isSidebarOpen ? SIDEBAR_PANEL_WIDTH_CSS : "0px" }}
    >
      <div className="mx-auto flex w-[85%] max-w-[1400px] items-end gap-3">{children}</div>
    </div>
  );
}
