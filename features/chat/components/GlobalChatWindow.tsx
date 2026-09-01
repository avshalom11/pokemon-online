"use client";

import type { FormEvent, RefObject } from "react";

import { OnlineStatusDot } from "@/components/social/OnlineStatusDot";
import { PlayerNameLink } from "@/components/social/PlayerNameLink";
import { CHAT_ACCENT_TEXT_CLASSNAME, CHAT_INPUT_CLASSNAME, CHAT_SEND_BUTTON_CLASSNAME } from "@/features/chat/components/chat-theme";
import { GLOBAL_CHAT_MESSAGE_MAX_LENGTH } from "@/features/chat/config/global-chat.config";
import type { DisplayMessage } from "@/features/chat/hooks/use-global-chat";
import { ChatModerationMenu } from "@/features/moderation/components/ChatModerationMenu";

interface GlobalChatWindowProps {
  messages: DisplayMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isSending: boolean;
  sendError: string | null;
  listRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  // STAFF / MODERATION — PHASE 5 — see use-global-chat.ts's own
  // removeMessage doc comment: called after a successful deletion so the
  // row disappears from this client immediately.
  onMessageDeleted: (messageId: string) => void;
}

// GLOBAL CHAT — the message list + composer shared by BOTH chat
// presentations (GlobalChatBar's fixed overlay everywhere except Home;
// HomeChatPanel's embedded Home section) — see use-global-chat.ts's own
// doc comment for why the underlying state/logic is one shared hook. Only
// the OUTER chrome (fixed-vs-embedded container, minimize control) differs
// between the two callers; this is the part that must look and behave
// identically in both.
export function GlobalChatWindow({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  isSending,
  sendError,
  listRef,
  onScroll,
  onMessageDeleted,
}: GlobalChatWindowProps) {
  return (
    <>
      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            אין עדיין הודעות בצ׳אט. תהיו הראשונים לכתוב!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => (
              <li key={message.id} className={message.pending ? "opacity-60" : undefined}>
                <div className="flex items-baseline gap-2">
                  <OnlineStatusDot isOnline={message.isOnline} />
                  <PlayerNameLink
                    username={message.playerUsername}
                    displayName={message.playerDisplayName}
                    className={`text-sm font-semibold ${CHAT_ACCENT_TEXT_CLASSNAME}`}
                  />
                  <span className="text-[11px] text-slate-400">{message.sentTimeLabel}</span>
                  {/* STAFF / MODERATION — PHASE 5 — never rendered at all for a
                      pending/optimistic message (no real messageId yet to act
                      on server-side) — renders nothing itself unless the
                      current viewer is staff AND allowed to moderate this
                      sender (ChatModerationMenu's own doc comment). */}
                  {message.pending ? null : (
                    <ChatModerationMenu
                      messageId={message.id}
                      targetDisplayName={message.playerDisplayName}
                      senderStaffRole={message.senderStaffRole}
                      onMessageDeleted={onMessageDeleted}
                    />
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-100">{message.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sendError ? <p className="px-3 pb-1 text-xs text-rose-400">{sendError}</p> : null}

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-indigo-400/20 p-2">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          maxLength={GLOBAL_CHAT_MESSAGE_MAX_LENGTH}
          placeholder="כתבו הודעה..."
          className={CHAT_INPUT_CLASSNAME}
        />
        <button type="submit" disabled={isSending || inputValue.trim().length === 0} className={CHAT_SEND_BUTTON_CLASSNAME}>
          שלח
        </button>
      </form>
    </>
  );
}
