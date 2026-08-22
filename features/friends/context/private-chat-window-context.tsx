"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { openConversationAction } from "@/features/friends/actions/private-chat.actions";
import type { PrivateMessageView } from "@/features/friends/types";

export interface ActivePrivateConversation {
  conversationId: string;
  friendPlayerId: string;
  friendDisplayName: string;
  // CLICKABLE USERNAMES — see components/social/PlayerNameLink.tsx.
  friendUsername: string | null;
  // Seeded once from openConversationAction's own real read — only ever
  // used by FloatingPrivateChatWindow to seed usePrivateChat's initial
  // state the moment a NEW conversation becomes active (see that
  // component's own key={conversationId} remount, which is what makes a
  // fresh initialMessages value actually take effect on every friend
  // switch).
  initialMessages: PrivateMessageView[];
}

interface PrivateChatWindowContextValue {
  activeConversation: ActivePrivateConversation | null;
  isMinimized: boolean;
  isOpening: boolean;
  // ONLY ONE WINDOW AT A TIME (this feature's own Phase 1 scope) — calling
  // this for a different friend than whatever is currently active simply
  // REPLACES activeConversation, never opens a second window. Always
  // re-resolves/re-verifies the conversation server-side via
  // openConversationAction (never trusts a client-cached id), so a stale
  // friendship (theoretically revoked by a future "unfriend" feature)
  // would correctly fail to open rather than reusing an old id.
  openChat: (friendPlayerId: string, friendDisplayName: string) => Promise<void>;
  // Removes the window completely — never just hides it. The underlying
  // conversation/messages are untouched server-side; only the CLIENT's
  // "which window is currently showing" state is cleared.
  closeChat: () => void;
  minimizeChat: () => void;
  restoreChat: () => void;
}

const PrivateChatWindowContext = createContext<PrivateChatWindowContextValue | null>(null);

// FRIENDS + PRIVATE CHAT UX — the one shared piece of state that lets a
// "פתח צ׳אט" button anywhere in the app (today: only Profile's own Friends
// section) open a floating chat window that's actually rendered by the
// shared (game) layout, not by whatever page the button lives on — same
// "provider mounted once at the layout level, state survives client-side
// navigation because the layout itself never remounts" pattern this
// codebase already establishes for ActiveBattleProvider/
// PlayerProgressionProvider (see app/(game)/layout.tsx).
export function PrivateChatWindowProvider({ children }: { children: ReactNode }) {
  const [activeConversation, setActiveConversation] = useState<ActivePrivateConversation | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  async function openChat(friendPlayerId: string, friendDisplayName: string) {
    setIsOpening(true);
    setIsMinimized(false);
    const result = await openConversationAction(friendPlayerId);
    setIsOpening(false);

    // Not actually friends (a stale UI list, or a direct/spoofed call) —
    // silently no-op rather than opening a broken window; the server is
    // still the real authorization boundary here, this is purely
    // defensive.
    if (!result.ok) return;

    setActiveConversation({
      conversationId: result.conversation.conversationId,
      friendPlayerId,
      friendDisplayName: result.conversation.friendDisplayName,
      friendUsername: result.conversation.friendUsername,
      initialMessages: result.conversation.messages,
    });
  }

  function closeChat() {
    setActiveConversation(null);
    setIsMinimized(false);
  }

  function minimizeChat() {
    setIsMinimized(true);
  }

  function restoreChat() {
    setIsMinimized(false);
  }

  return (
    <PrivateChatWindowContext.Provider value={{ activeConversation, isMinimized, isOpening, openChat, closeChat, minimizeChat, restoreChat }}>
      {children}
    </PrivateChatWindowContext.Provider>
  );
}

export function usePrivateChatWindow(): PrivateChatWindowContextValue {
  const context = useContext(PrivateChatWindowContext);
  if (!context) {
    throw new Error("usePrivateChatWindow must be used within a PrivateChatWindowProvider");
  }
  return context;
}
