"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";

import { getConversationMessagesAction, sendPrivateMessageAction } from "@/features/friends/actions/private-chat.actions";
import { PRIVATE_CHAT_MESSAGE_MAX_LENGTH, PRIVATE_CHAT_POLL_INTERVAL_MS } from "@/features/friends/config/friends.config";
import type { PrivateMessageView, SendPrivateMessageError } from "@/features/friends/types";
import { usePageVisible } from "@/lib/hooks/use-page-visible";

const NEAR_BOTTOM_THRESHOLD_PX = 60;

const PRIVATE_CHAT_ERROR_LABELS: Record<SendPrivateMessageError, string> = {
  empty: "לא ניתן לשלוח הודעה ריקה",
  "too-long": `ההודעה ארוכה מדי (מקסימום ${PRIVATE_CHAT_MESSAGE_MAX_LENGTH} תווים)`,
  "not-a-participant": "אין גישה לשיחה הזו",
  // REMOVE FRIEND — shown if a message is sent into a conversation whose
  // friendship has since been removed (sendPrivateMessage's own new
  // areFriends re-check — private-chat.service.ts).
  "not-friends": "אינכם חברים יותר — לא ניתן לשלוח הודעות",
  unauthenticated: "יש להתחבר כדי לשלוח הודעות",
};

export type PrivateDisplayMessage = PrivateMessageView & { pending?: boolean };

function formatClientSentTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
}

// Same reconcile-optimistic-with-poll idiom as Global Chat's own
// mergeWithFresh (features/chat/hooks/use-global-chat.ts) — kept as an
// independent copy rather than a shared import so a future change to
// either feature's merge rule can never silently affect the other.
function mergeWithFresh(current: PrivateDisplayMessage[], fresh: PrivateMessageView[]): PrivateDisplayMessage[] {
  const freshIds = new Set(fresh.map((message) => message.id));
  const stillPending = current.filter((message) => message.pending && !freshIds.has(message.id));
  return [...fresh, ...stillPending];
}

export interface UsePrivateChatOptions {
  conversationId: string;
  initialMessages: PrivateMessageView[];
  currentPlayerDisplayName: string;
  // CLICKABLE USERNAMES — for the CALLER's own optimistic message only,
  // same "null renders as plain text" convention as Global Chat's own
  // use-global-chat.ts.
  currentPlayerUsername: string | null;
}

export interface UsePrivateChatResult {
  messages: PrivateDisplayMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isSending: boolean;
  sendError: string | null;
  handleSend: (event: FormEvent) => Promise<void>;
  listRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
}

// FRIENDS PHASE 1 — PRIVATE CHAT. The message-list/poll/send/scroll
// behavior for ONE open conversation — a deliberately independent parallel
// to features/chat/hooks/use-global-chat.ts (same shape/pattern reused,
// per this feature's own "reuse the lightweight polling approach already
// used by Global Chat" spec) rather than a shared hook: Global Chat polls
// one site-wide feed while merely expanded, this polls exactly one
// specific conversationId while its page is mounted — different enough
// inputs/lifecycle that forcing them through one generic hook would need
// more branching than just keeping two small, independently-correct
// copies. Never polls any OTHER conversation — this hook only ever exists
// once per mounted PrivateChatContent, for the one conversation its own
// page resolved.
export function usePrivateChat({
  conversationId,
  initialMessages,
  currentPlayerDisplayName,
  currentPlayerUsername,
}: UsePrivateChatOptions): UsePrivateChatResult {
  const [messages, setMessages] = useState<PrivateDisplayMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const isPageVisible = usePageVisible();

  // SITE RENDER PERFORMANCE — pauses while the tab is hidden; re-running on
  // `isPageVisible` flipping true reuses the same unconditional `tick()` at
  // the top of the effect that already runs for "conversation just opened",
  // so becoming visible again gets one immediate refresh for free.
  useEffect(() => {
    if (!isPageVisible) return;

    let cancelled = false;
    async function tick() {
      try {
        const fresh = await getConversationMessagesAction(conversationId);
        if (cancelled) return;
        setMessages((current) => mergeWithFresh(current, fresh));
      } catch {
        // A transient poll failure just tries again next tick.
      }
    }

    tick();
    const interval = setInterval(tick, PRIVATE_CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, isPageVisible]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || trimmed.length > PRIVATE_CHAT_MESSAGE_MAX_LENGTH || isSending) return;

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
        pending: true,
      },
    ]);

    const result = await sendPrivateMessageAction(conversationId, trimmed);
    setIsSending(false);

    if (!result.ok) {
      setMessages((current) => current.filter((message) => message.id !== tempId));
      setSendError(PRIVATE_CHAT_ERROR_LABELS[result.error]);
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
