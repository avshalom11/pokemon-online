"use client";

import { useEffect, useRef, useState } from "react";

import { getNotificationBellDataAction } from "@/features/notifications/actions/notification.actions";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";
import { usePageVisible } from "@/lib/hooks/use-page-visible";

// How often this polls for new PRIVATE_MESSAGE_RECEIVED notifications —
// same interval Global Chat/Private Chat already poll at.
const POLL_INTERVAL_MS = 2500;
// How long a toast stays up before auto-dismissing.
const AUTO_DISMISS_MS = 6000;

interface Toast {
  // The notification's own id — also this feature's own dedup key (see
  // the polling effect below).
  id: string;
  senderPlayerId: string;
  senderDisplayName: string;
}

interface PrivateMessageMetadata {
  conversationId?: unknown;
  senderPlayerId?: unknown;
  senderDisplayName?: unknown;
}

// FRIENDS QUICK ACTIONS — INCOMING PRIVATE MESSAGE POPUP. Mounted once by
// app/(game)/layout.tsx, inside PrivateChatWindowProvider (needs
// usePrivateChatWindow to know whether the sender's conversation is
// already open — see below). Reuses the exact same lightweight polling
// pattern Global Chat/Private Chat already established — a plain
// setInterval + server action, no WebSockets — polling
// getNotificationBellDataAction (the SAME query the header's own bell
// already uses server-side, now just also callable from the client on an
// interval) and filtering for PRIVATE_MESSAGE_RECEIVED entries client-side,
// rather than adding a second, dedicated query.
//
// DEDUP (ticket's own "each new-message notification should trigger the
// popup once", "same notification is not shown repeatedly") — every
// notification id this component has ever SEEN (whether or not it actually
// showed a toast for it) goes into `seenIdsRef`, checked before anything
// else on every poll tick. The first tick after mount seeds this set from
// whatever's already unread WITHOUT showing any toasts — a page load must
// never retroactively pop up toasts for messages that arrived before this
// component existed. Since sendPrivateMessage's own notification dedup
// rule (private-chat.service.ts) already collapses a rapid back-and-forth
// into a single unread notification per conversation, this component never
// even sees more than one open id per burst to begin with.
//
// SUPPRESSING THE OPEN CONVERSATION (ticket's own "if reliable 'currently
// open chat' detection is already available via PrivateChatWindowContext,
// use it client-side" — never server-side presence): a qualifying
// notification is still marked "seen" (so it can never pop up later) even
// when suppressed, using activeConversation/isMinimized read through refs
// so this effect never needs to restart just because those change.
export function PrivateMessagePopupWatcher() {
  const { activeConversation, isMinimized, openChat } = usePrivateChatWindow();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const activeConversationRef = useRef(activeConversation);
  const isMinimizedRef = useRef(isMinimized);
  activeConversationRef.current = activeConversation;
  isMinimizedRef.current = isMinimized;
  const isPageVisible = usePageVisible();

  // SITE RENDER PERFORMANCE — pauses while the tab is hidden; re-running on
  // `isPageVisible` flipping true reuses the same unconditional `tick()` at
  // the top of the effect that already runs on mount, so becoming visible
  // again gets one immediate refresh for free.
  useEffect(() => {
    if (!isPageVisible) return;

    let cancelled = false;

    async function tick() {
      try {
        const data = await getNotificationBellDataAction();
        if (cancelled) return;

        const unreadPrivateMessages = data.recent.filter((n) => n.type === "PRIVATE_MESSAGE_RECEIVED" && !n.isRead);

        if (seenIdsRef.current === null) {
          seenIdsRef.current = new Set(unreadPrivateMessages.map((n) => n.id));
          return;
        }

        for (const notification of unreadPrivateMessages) {
          if (seenIdsRef.current.has(notification.id)) continue;
          seenIdsRef.current.add(notification.id);

          const metadata = (notification.metadata ?? {}) as PrivateMessageMetadata;
          if (typeof metadata.conversationId !== "string" || typeof metadata.senderPlayerId !== "string") continue;

          const isThatConversationOpenAndVisible =
            activeConversationRef.current?.conversationId === metadata.conversationId && !isMinimizedRef.current;
          if (isThatConversationOpenAndVisible) continue;

          const toastId = notification.id;
          setToasts((current) => [
            ...current,
            {
              id: toastId,
              senderPlayerId: metadata.senderPlayerId as string,
              senderDisplayName: typeof metadata.senderDisplayName === "string" ? metadata.senderDisplayName : "שחקן",
            },
          ]);
          setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== toastId));
          }, AUTO_DISMISS_MS);
        }
      } catch {
        // A transient poll failure just tries again next tick.
      }
    }

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isPageVisible]);

  function handleOpen(toast: Toast) {
    setToasts((current) => current.filter((t) => t.id !== toast.id));
    openChat(toast.senderPlayerId, toast.senderDisplayName);
  }

  function handleDismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div dir="rtl" className="fixed bottom-[calc(var(--app-chat-bar-height)+1rem)] right-4 z-[47] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-slate-900/95 px-3 py-2.5 shadow-2xl backdrop-blur-md"
        >
          <button type="button" onClick={() => handleOpen(toast)} className="flex-1 text-right text-sm font-medium text-slate-100">
            הודעה חדשה מ־{toast.senderDisplayName}
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(toast.id)}
            aria-label="סגור"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      ))}
    </div>
  );
}
