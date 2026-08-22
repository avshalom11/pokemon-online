"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  CHAT_ACCENT_BORDER_COLOR_CLASSNAME,
  CHAT_HEADER_BG_CLASSNAME,
  CHAT_PANEL_BG_CLASSNAME,
  CHAT_PANEL_BORDER_CLASSNAME,
} from "@/features/chat/components/chat-theme";
import { GlobalChatWindow } from "@/features/chat/components/GlobalChatWindow";
import { useGlobalChat } from "@/features/chat/hooks/use-global-chat";
import type { GlobalChatMessageView } from "@/features/chat/types";
import { isHomePathname, shouldForceCollapseOnRouteChange } from "@/features/chat/utils/route-chat-visibility";

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
// auto-collapse below react live, with no page refresh, and why the hook
// call below stays unconditional even though the component can return null
// (Rules of Hooks — the early return happens after every hook has run).
//
// ROUTE-DRIVEN DEFAULT — collapsed by default everywhere this renders (Home
// is the only "expanded by default" surface, and it never uses this
// component). Leaving Home always forces this back to collapsed, even if
// the player had it manually expanded on an earlier non-Home page;
// navigating between two non-Home pages never resets an already-expanded
// bar, so a manual "keep it open while I browse" choice survives ordinary
// navigation — only a Home visit resets it (see
// shouldForceCollapseOnRouteChange's own doc comment). Deliberately no
// localStorage: an old persisted "expanded" value forcing the bar open on
// every future page load — the exact failure mode this feature was
// explicitly built to avoid — is impossible if there is nothing to read on
// mount; the route rules above are the only source of truth for the
// default.
export function GlobalChatBar({ initialMessages, currentPlayerDisplayName, currentPlayerUsername }: GlobalChatBarProps) {
  const pathname = usePathname();
  const isHome = isHomePathname(pathname);

  const [minimized, setMinimized] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    if (shouldForceCollapseOnRouteChange(prevPathname, pathname)) {
      setMinimized(true);
    }
    setPrevPathname(pathname);
  }

  const chat = useGlobalChat({ initialMessages, currentPlayerDisplayName, currentPlayerUsername, active: !isHome && !minimized });

  if (isHome) return null;

  if (minimized) {
    return (
      <div dir="rtl" className="fixed inset-x-0 bottom-0 z-40">
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

  return (
    <div
      dir="rtl"
      className={`fixed inset-x-0 bottom-0 z-40 flex h-72 max-h-[45vh] flex-col ${CHAT_PANEL_BORDER_CLASSNAME} ${CHAT_PANEL_BG_CLASSNAME} shadow-2xl backdrop-blur-md sm:h-80`}
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
      />
    </div>
  );
}
