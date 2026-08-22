"use client";

import type { FormEvent, RefObject } from "react";

import { PlayerNameLink } from "@/components/social/PlayerNameLink";
import { CHAT_ACCENT_TEXT_CLASSNAME, CHAT_INPUT_CLASSNAME, CHAT_SEND_BUTTON_CLASSNAME } from "@/features/chat/components/chat-theme";
import { PRIVATE_CHAT_MESSAGE_MAX_LENGTH } from "@/features/friends/config/friends.config";
import type { PrivateDisplayMessage } from "@/features/friends/hooks/use-private-chat";

interface PrivateChatWindowProps {
  messages: PrivateDisplayMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isSending: boolean;
  sendError: string | null;
  listRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

// FRIENDS PHASE 1 — PRIVATE CHAT. The message list + composer for one open
// conversation — structurally the same pattern as Global Chat's own
// GlobalChatWindow.tsx (features/chat/components), reused here as an
// independent copy rather than a shared import so a change to either
// feature's markup/config can never ripple into the other (same reasoning
// use-private-chat.ts's own doc comment gives for not sharing the hook).
// The visual theme constants (chat-theme.ts) ARE reused directly — pure,
// behavior-free style values, safe to share for a consistent "this is a
// chat surface" look across both features.
export function PrivateChatWindow({ messages, inputValue, onInputChange, onSubmit, isSending, sendError, listRef, onScroll }: PrivateChatWindowProps) {
  return (
    <>
      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            אין עדיין הודעות. תהיו הראשונים לכתוב!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => (
              <li key={message.id} className={message.pending ? "opacity-60" : undefined}>
                <div className="flex items-baseline gap-2">
                  <PlayerNameLink
                    username={message.playerUsername}
                    displayName={message.playerDisplayName}
                    className={`text-sm font-semibold ${CHAT_ACCENT_TEXT_CLASSNAME}`}
                  />
                  <span className="text-[11px] text-slate-400">{message.sentTimeLabel}</span>
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
          maxLength={PRIVATE_CHAT_MESSAGE_MAX_LENGTH}
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
