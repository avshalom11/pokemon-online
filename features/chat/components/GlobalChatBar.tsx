"use client";

import { useSidebarOpen } from "@/components/layout/sidebar-open-context";
import {
  CHAT_ACCENT_BORDER_COLOR_CLASSNAME,
  CHAT_HEADER_BG_CLASSNAME,
  CHAT_PANEL_BG_CLASSNAME,
  CHAT_PANEL_BORDER_CLASSNAME,
} from "@/features/chat/components/chat-theme";
import { GlobalChatWindow } from "@/features/chat/components/GlobalChatWindow";
import { useGlobalChatBarLayout } from "@/features/chat/context/global-chat-bar-layout-context";
import { useGlobalChat } from "@/features/chat/hooks/use-global-chat";
import type { GlobalChatMessageView } from "@/features/chat/types";
import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";

interface GlobalChatBarProps {
  initialMessages: GlobalChatMessageView[];
  currentPlayerDisplayName: string;
  currentPlayerUsername: string | null;
}

// GLOBAL CHAT — the fixed bottom overlay used on every authenticated page
// EXCEPT Home, which embeds its own chat section directly in the page
// content instead (features/chat/components/HomeChatPanel.tsx) — this
// component simply renders nothing on Home. Mounted once by
// app/(game)/layout.tsx alongside GameHeader/GameSidebar, so this single
// instance persists across every client-side navigation for the lifetime
// of the (game) layout (Next.js layouts don't remount on a route change
// within the same segment) — that's what makes the route-driven
// auto-collapse (now owned by GlobalChatBarLayoutProvider — see that
// module's own doc comment) react live, with no page refresh, and why the
// hook calls below stay unconditional even though the component can return
// null (Rules of Hooks — the early return happens after every hook has
// run).
//
// ROUTE-DRIVEN DEFAULT — collapsed by default everywhere this renders (Home
// is the only "expanded by default" surface, and it never uses this
// component). Leaving Home always forces this back to collapsed, even if
// the player had it manually expanded on an earlier non-Home page;
// navigating between two non-Home pages never resets an already-expanded
// bar, so a manual "keep it open while I browse" choice survives ordinary
// navigation — only a Home visit resets it. Deliberately no localStorage:
// an old persisted "expanded" value forcing the bar open on every future
// page load — the exact failure mode this feature was explicitly built to
// avoid — is impossible if there is nothing to read on mount; the route
// rules in GlobalChatBarLayoutProvider are the only source of truth for the
// default.
export function GlobalChatBar({ initialMessages, currentPlayerDisplayName, currentPlayerUsername }: GlobalChatBarProps) {
  const { isHome, minimized, setMinimized } = useGlobalChatBarLayout();
  const chat = useGlobalChat({ initialMessages, currentPlayerDisplayName, currentPlayerUsername, active: !isHome && !minimized });
  // RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. Read unconditionally,
  // same "before the isHome early return" placement useGlobalChat above
  // already follows (Rules of Hooks — the early return only happens after
  // every hook has run). Only used by the expanded panel below — the
  // minimized bar's own sidebar-aware positioning is now owned by the
  // shared BottomDock wrapper (components/layout/BottomDock.tsx) instead.
  const { isOpen: isSidebarOpen } = useSidebarOpen();

  if (isHome) return null;

  if (minimized) {
    // BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT. No longer its own fixed,
    // self-centered bar — BottomDock (mounted once in app/(game)/layout.tsx,
    // wrapping this component together with SocialDock) now owns the one
    // fixed, sidebar-aware, centered w-[85%] max-w-[1400px] row this used to
    // center itself alone in (see this file's own prior "CENTERED WIDTH"
    // ticket) — the same box now holds Friends beside it too. This is
    // simply that row's flexible chat slot: flex-1 so it fills whatever
    // space Friends doesn't need, min-w-0 so it can still shrink instead of
    // overflowing the row on a narrow viewport.
    return (
      <div dir="rtl" className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className={`flex h-11 w-full items-center justify-center gap-2 border-t ${CHAT_ACCENT_BORDER_COLOR_CLASSNAME} ${CHAT_HEADER_BG_CLASSNAME} text-sm font-medium text-slate-200 backdrop-blur-md transition-colors hover:bg-indigo-900/60`}
          aria-label="הרחב את הצ׳אט הראשי"
        >
          <span aria-hidden="true">▲</span>
          צ׳אט ראשי
        </button>
      </div>
    );
  }

  // Both fixed bars below use left-0 plus an inline `right` (instead of
  // inset-x-0) so the sidebar's own width can push their right edge left of
  // it while it's open — never a wider bar overlapping the sidebar under a
  // higher z-index, which would just hide the sidebar rather than staying
  // "fully visible and unobstructed". transition-[right] duration-200
  // matches the sidebar's own open/close transition (its toggle button and
  // aside panel both use the same 200ms), so both move as one motion. The
  // expanded panel below is left completely unchanged by the BOTTOM UI —
  // FRIENDS PANEL BESIDE GLOBAL CHAT ticket: it keeps its own full-width
  // fixed positioning exactly as before (BottomDock passes it straight
  // through as a plain child while it's showing — see BottomDock's own doc
  // comment).
  const rightInsetStyle = { right: isSidebarOpen ? SIDEBAR_PANEL_WIDTH_CSS : "0px" };

  return (
    <div
      dir="rtl"
      className={`fixed left-0 bottom-0 z-40 flex h-72 max-h-[45vh] flex-col ${CHAT_PANEL_BORDER_CLASSNAME} ${CHAT_PANEL_BG_CLASSNAME} shadow-2xl backdrop-blur-md transition-[right] duration-200 sm:h-80`}
      style={rightInsetStyle}
    >
      <div className={`flex items-center justify-between border-b border-indigo-400/20 px-3 py-2 ${CHAT_HEADER_BG_CLASSNAME}`}>
        <span className="text-sm font-semibold text-slate-100">צ׳אט ראשי</span>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="מזער את הצ׳אט הראשי"
        >
          <span aria-hidden="true">▼</span>
        </button>
      </div>

      <GlobalChatWindow
        messages={chat.messages}
        inputValue={chat.inputValue}
        onInputChange={chat.setInputValue}
        onSubmit={chat.handleSend}
        isSending={chat.isSending}
        sendError={chat.sendError}
        listRef={chat.listRef}
        onScroll={chat.handleScroll}
        onMessageDeleted={chat.removeMessage}
      />
    </div>
  );
}
