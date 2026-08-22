"use client";

import { PlayerNameLink } from "@/components/social/PlayerNameLink";
import {
  CHAT_ACCENT_BORDER_COLOR_CLASSNAME,
  CHAT_HEADER_BG_CLASSNAME,
  CHAT_PANEL_BG_CLASSNAME,
  CHAT_PANEL_BORDER_CLASSNAME,
} from "@/features/chat/components/chat-theme";
import { PrivateChatWindow } from "@/features/friends/components/PrivateChatWindow";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";
import { usePrivateChat } from "@/features/friends/hooks/use-private-chat";
import type { PrivateMessageView } from "@/features/friends/types";

interface FloatingPrivateChatWindowProps {
  currentPlayerDisplayName: string;
  currentPlayerUsername: string | null;
}

// FRIENDS + PRIVATE CHAT UX — the compact, bottom-right floating private
// chat window, mounted once by app/(game)/layout.tsx (same mount pattern
// as GlobalChatBar) so it persists across every client-side navigation for
// the lifetime of the (game) layout — opening a chat on Profile and then
// navigating to Home/Map/Gyms never destroys it (this feature's own
// "navigation persistence" requirement). All state (which conversation is
// active, minimized or expanded) lives in PrivateChatWindowProvider
// (private-chat-window-context.tsx), never here.
//
// FRIENDS UI — MINIMIZED CHAT POSITION FIX. This component no longer
// self-positions at all (neither branch carries a `fixed`/`right-`/`z-`
// class) — it's rendered as a plain flex child of SocialDock
// (features/friends/components/SocialDock.tsx), which is the ONE place
// bottom-right fixed positioning/z-index for the social panels now lives,
// rendered BEFORE FriendsBar in that dock's children so it always sits
// immediately to FriendsBar's left with a small flex `gap`, regardless of
// which panel is currently collapsed vs. expanded. See SocialDock's own
// doc comment for the full reasoning, including the real playtest bug
// this replaced (a fixed sm:right-[22rem] offset sized for Friends Bar's
// EXPANDED width, which left a large, unrelated gap — reading as "floating
// near the middle of the screen" — whenever Friends Bar was collapsed
// instead).
export function FloatingPrivateChatWindow({ currentPlayerDisplayName, currentPlayerUsername }: FloatingPrivateChatWindowProps) {
  const { activeConversation, isMinimized, minimizeChat, restoreChat, closeChat } = usePrivateChatWindow();

  if (!activeConversation) return null;

  if (isMinimized) {
    return (
      <button
        type="button"
        dir="rtl"
        onClick={restoreChat}
        aria-label={`הרחב את הצ׳אט עם ${activeConversation.friendDisplayName}`}
        className={`flex items-center gap-2 rounded-full border ${CHAT_ACCENT_BORDER_COLOR_CLASSNAME} ${CHAT_HEADER_BG_CLASSNAME} px-4 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:bg-indigo-900/60`}
      >
        <span aria-hidden="true">💬</span>
        {activeConversation.friendDisplayName}
      </button>
    );
  }

  return (
    <ExpandedPrivateChatWindow
      key={activeConversation.conversationId}
      conversationId={activeConversation.conversationId}
      friendDisplayName={activeConversation.friendDisplayName}
      friendUsername={activeConversation.friendUsername}
      initialMessages={activeConversation.initialMessages}
      currentPlayerDisplayName={currentPlayerDisplayName}
      currentPlayerUsername={currentPlayerUsername}
      onMinimize={minimizeChat}
      onClose={closeChat}
    />
  );
}

interface ExpandedPrivateChatWindowProps {
  conversationId: string;
  friendDisplayName: string;
  friendUsername: string | null;
  initialMessages: PrivateMessageView[];
  currentPlayerDisplayName: string;
  currentPlayerUsername: string | null;
  onMinimize: () => void;
  onClose: () => void;
}

// Keyed by conversationId at its one call site above — switching to a
// different friend (this feature's own "only one window, switching
// replaces it" rule) fully remounts this component, which is what resets
// usePrivateChat's internal message list/input/scroll state to the new
// conversation's own initialMessages instead of carrying over the
// previous friend's chat.
function ExpandedPrivateChatWindow({
  conversationId,
  friendDisplayName,
  friendUsername,
  initialMessages,
  currentPlayerDisplayName,
  currentPlayerUsername,
  onMinimize,
  onClose,
}: ExpandedPrivateChatWindowProps) {
  const chat = usePrivateChat({ conversationId, initialMessages, currentPlayerDisplayName, currentPlayerUsername });

  return (
    <div
      dir="rtl"
      className={`flex h-96 max-h-[60vh] w-80 max-w-[90vw] flex-col overflow-hidden rounded-2xl ${CHAT_PANEL_BORDER_CLASSNAME} ${CHAT_PANEL_BG_CLASSNAME} shadow-2xl backdrop-blur-md`}
    >
      <div className={`flex items-center justify-between px-3 py-2 ${CHAT_HEADER_BG_CLASSNAME}`}>
        <PlayerNameLink username={friendUsername} displayName={friendDisplayName} className="truncate text-sm font-semibold text-slate-100" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="מזער את הצ׳אט"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">▾</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור את הצ׳אט"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>

      <PrivateChatWindow
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
