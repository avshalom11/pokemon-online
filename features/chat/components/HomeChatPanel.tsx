"use client";

import { useState } from "react";

import { CHAT_HEADER_BG_CLASSNAME, CHAT_PANEL_BG_CLASSNAME, CHAT_PANEL_BORDER_CLASSNAME } from "@/features/chat/components/chat-theme";
import { GlobalChatWindow } from "@/features/chat/components/GlobalChatWindow";
import { useGlobalChat } from "@/features/chat/hooks/use-global-chat";
import type { GlobalChatMessageView } from "@/features/chat/types";

interface HomeChatPanelProps {
  initialMessages: GlobalChatMessageView[];
  currentPlayerDisplayName: string;
  currentPlayerUsername: string | null;
}

// GLOBAL CHAT — HOME EMBED. Home is the one page that presents chat as an
// actual page section, sitting naturally in the page's own content flow —
// not the fixed bottom overlay GlobalChatBar.tsx renders on every other
// page (that component returns null specifically on Home, so this is the
// only chat surface ever visible here; see its own doc comment).
//
// Always mounts expanded (`useState(false)` below): this component only
// exists while HomeContent is mounted, and client-side navigation
// unmounts/remounts HomeContent on every Home visit, so a fresh default is
// all "show it expanded every time you return to Home" needs — no
// persistence required, and none is used.
//
// The collapse control here is purely a local, per-visit convenience (never
// route-driven, never persisted) so a player can tuck the chat away while
// looking at the rest of Home without that choice affecting any other
// page's own chat state.
export function HomeChatPanel({ initialMessages, currentPlayerDisplayName, currentPlayerUsername }: HomeChatPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const chat = useGlobalChat({ initialMessages, currentPlayerDisplayName, currentPlayerUsername, active: !minimized });

  return (
    <div
      dir="rtl"
      className={`flex h-80 flex-col overflow-hidden rounded-2xl sm:h-96 ${CHAT_PANEL_BORDER_CLASSNAME} ${CHAT_PANEL_BG_CLASSNAME} shadow-lg`}
    >
      <div className={`flex items-center justify-between px-4 py-2.5 ${CHAT_HEADER_BG_CLASSNAME}`}>
        <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">צ׳אט ראשי</h3>
        <button
          type="button"
          onClick={() => setMinimized((current) => !current)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={minimized ? "הרחב את הצ׳אט" : "מזער את הצ׳אט"}
        >
          <span aria-hidden="true">{minimized ? "▲" : "▼"}</span>
        </button>
      </div>

      {minimized ? null : (
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
      )}
    </div>
  );
}
