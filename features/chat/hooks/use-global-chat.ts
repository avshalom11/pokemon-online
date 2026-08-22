"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";

import { getGlobalChatMessagesAction, sendGlobalChatMessageAction } from "@/features/chat/actions/global-chat.actions";
import { GLOBAL_CHAT_MESSAGE_MAX_LENGTH, GLOBAL_CHAT_POLL_INTERVAL_MS } from "@/features/chat/config/global-chat.config";
import type { GlobalChatMessageView, SendGlobalChatMessageError } from "@/features/chat/types";

const NEAR_BOTTOM_THRESHOLD_PX = 60;

export const GLOBAL_CHAT_ERROR_LABELS: Record<SendGlobalChatMessageError, string> = {
  empty: "לא ניתן לשלוח הודעה ריקה",
  "too-long": `ההודעה ארוכה מדי (מקסימום ${GLOBAL_CHAT_MESSAGE_MAX_LENGTH} תווים)`,
  cooldown: "אנא המתן רגע לפני שליחת הודעה נוספת",
  // Never actually reachable in practice (chat only ever renders inside the
  // authenticated (game) layout), but included so the error union stays
  // exhaustively handled.
  unauthenticated: "יש להתחבר כדי לשלוח הודעות",
};

// A locally-sent message shown the instant Send is clicked, before the
// server round trip confirms it — see mergeWithFresh below for how it's
// reconciled with the next poll tick.
export type DisplayMessage = GlobalChatMessageView & { pending?: boolean };

function formatClientSentTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
}

// Replaces the confirmed half of the list with the server's own canonical
// order/cap (`fresh` is already oldest-first, capped at
// GLOBAL_CHAT_MAX_MESSAGES) while keeping any optimistic message this
// client sent that the server doesn't know about yet — identified by not
// appearing in `fresh` by id. Once a pending id does appear in `fresh` (the
// next poll after it was actually persisted), the pending copy is dropped
// here and the confirmed one from `fresh` takes over, so there's never a
// lasting duplicate.
function mergeWithFresh(current: DisplayMessage[], fresh: GlobalChatMessageView[]): DisplayMessage[] {
  const freshIds = new Set(fresh.map((message) => message.id));
  const stillPending = current.filter((message) => message.pending && !freshIds.has(message.id));
  return [...fresh, ...stillPending];
}

export interface UseGlobalChatOptions {
  initialMessages: GlobalChatMessageView[];
  currentPlayerDisplayName: string;
  // CLICKABLE USERNAMES — for the CALLER's own optimistic message only
  // (server-confirmed messages already carry their own resolved
  // playerUsername from the action's real response). null renders as plain
  // text via PlayerNameLink, same as any other unresolved username.
  currentPlayerUsername: string | null;
  // Whether this consumer is actually visible right now — polling, and the
  // "scroll to newest on open" behavior, only run while true. GlobalChatBar
  // (the fixed overlay, everywhere except Home) and HomeChatPanel (Home's
  // embedded section) each pass their own visibility here, so only one of
  // them is ever actually polling at a time even though GlobalChatBar's own
  // component instance stays mounted (rendering null on Home) for the
  // whole game-layout lifetime.
  active: boolean;
}

export interface UseGlobalChatResult {
  messages: DisplayMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isSending: boolean;
  sendError: string | null;
  handleSend: (event: FormEvent) => Promise<void>;
  listRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
}

// GLOBAL CHAT — the message-list/poll/send/scroll behavior shared by BOTH
// presentations (GlobalChatBar's fixed overlay; HomeChatPanel's embedded
// Home section). Extracted into one hook specifically so this UI/layout
// follow-up ("keep the existing message list/input/send behavior") is
// mechanically true — there is exactly one implementation of this logic,
// unchanged from the original GlobalChatBar, never two that could drift
// apart between the two presentations.
export function useGlobalChat({
  initialMessages,
  currentPlayerDisplayName,
  currentPlayerUsername,
  active,
}: UseGlobalChatOptions): UseGlobalChatResult {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Polling — only while this consumer is actually visible.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    async function tick() {
      try {
        const fresh = await getGlobalChatMessagesAction();
        if (cancelled) return;
        setMessages((current) => mergeWithFresh(current, fresh));
      } catch {
        // A transient poll failure just tries again next tick — never
        // surfaced to the user as an error.
      }
    }

    tick();
    const interval = setInterval(tick, GLOBAL_CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active]);

  // "When chat first opens: scroll to the newest message."
  useEffect(() => {
    if (!active) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
  }, [active]);

  // "If the user is already near the bottom, new messages should keep them
  // at the bottom. If the user manually scrolled upward, do NOT forcibly
  // drag them back down every poll." stickToBottomRef is updated by
  // handleScroll below, read here after every message-list change.
  useEffect(() => {
    if (!active) return;
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, active]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || trimmed.length > GLOBAL_CHAT_MESSAGE_MAX_LENGTH || isSending) return;

    setSendError(null);
    setIsSending(true);
    setInputValue("");
    stickToBottomRef.current = true;

    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date();
    setMessages((current) => [
      ...current,
      {
        id: tempId,
        playerDisplayName: currentPlayerDisplayName,
        playerUsername: currentPlayerUsername,
        message: trimmed,
        createdAt: now.toISOString(),
        sentTimeLabel: formatClientSentTime(now),
        // ONLINE PRESENCE — the caller sending this message is, by
        // definition, online right now.
        isOnline: true,
        pending: true,
      },
    ]);

    const result = await sendGlobalChatMessageAction(trimmed);
    setIsSending(false);

    if (!result.ok) {
      setMessages((current) => current.filter((message) => message.id !== tempId));
      setSendError(GLOBAL_CHAT_ERROR_LABELS[result.error]);
      return;
    }

    setMessages((current) => {
      const withoutTemp = current.filter((message) => message.id !== tempId);
      if (withoutTemp.some((message) => message.id === result.message.id)) return withoutTemp;
      return [...withoutTemp, result.message];
    });
  }

  return { messages, inputValue, setInputValue, isSending, sendError, handleSend, listRef, handleScroll };
}
