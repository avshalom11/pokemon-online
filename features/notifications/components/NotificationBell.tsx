"use client";

import { useState, useTransition } from "react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions/notification.actions";
import type { NotificationBellData, NotificationSummary } from "@/features/notifications/types";

interface NotificationBellProps {
  initial: NotificationBellData;
}

// The global header's notification bell + dropdown — the one UI surface for
// every non-blocking meta/progression event (level-ups today; item finds,
// evolutions, etc. later — see features/notifications/types.ts). Seeded
// from `initial` (fetched server-side by app/(game)/layout.tsx alongside
// the rest of the header's data) and re-synced whenever that prop changes —
// a battle-triggered level-up creates its notification server-side, and
// Next's existing Server Action revalidation (already relied on for the
// header's live XP display) re-renders the layout with a fresh count, which
// flows in here automatically. No polling.
export function NotificationBell({ initial }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initial.recent);
  const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
  const [, startTransition] = useTransition();

  // Re-sync local state when fresh server data arrives (e.g. a
  // battle-triggered level-up, flowed in via Next's existing Server Action
  // revalidation) — adjusted during render rather than in a useEffect, the
  // pattern React recommends for "reset state when a prop changes"
  // (https://react.dev/learn/you-might-not-need-an-effect), which also
  // avoids the extra render pass a setState-in-effect would cause.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setNotifications(initial.recent);
    setUnreadCount(initial.unreadCount);
  }

  // Opening the panel is now what marks everything read — no more manual
  // "mark all as read" button (see the removed handleMarkAllRead below;
  // markAllAsRead is what it became). Reads `isOpen`/`unreadCount` straight
  // from this render's closure, exactly like every other handler here
  // (handleMarkRead, the old handleMarkAllRead) — safe because a click only
  // ever calls this once per user action, so there's no risk of the toggle
  // itself firing markAllAsRead twice in a row. Closing never calls it: the
  // guard is `next` (about to open), not `isOpen` (already open), so
  // repeatedly toggling the panel — open, close, open again — only ever
  // marks-as-read on each fresh *open*, never on close, and each of those
  // opens is its own single click, never a repeated request while the panel
  // merely stays open.
  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      markAllAsRead();
    }
  }

  function handleClose() {
    setIsOpen(false);
  }

  // Optimistic: the badge/list update immediately, the Server Action fires
  // in the background — never blocks opening/reading the panel.
  function handleMarkRead(notification: NotificationSummary) {
    if (notification.isRead) return;

    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(() => {
      markNotificationReadAction(notification.id);
    });
  }

  // Server-side source of truth: markAllNotificationsReadAction ->
  // markAllNotificationsRead (features/notifications/services/
  // notification-service.ts) already scopes its update to the caller's own
  // playerId (resolved server-side from the session, never trusted from
  // the client) and never deletes anything — reused as-is here, unchanged.
  // The local state update is optimistic (instant badge/dot clearing); the
  // fire-and-forget server call is what actually persists it.
  function markAllAsRead() {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    startTransition(() => {
      markAllNotificationsReadAction();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="התראות"
        aria-label="התראות"
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition-colors hover:border-white/20 hover:text-white sm:h-9 sm:w-9"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div
            dir="rtl"
            className="absolute end-0 top-full z-50 mt-2 w-72 max-w-[85vw] overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-md"
          >
            <div className="border-b border-white/10 px-3 py-2">
              <span className="text-sm font-semibold text-slate-100">התראות</span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">אין התראות חדשות</p>
              ) : (
                <ul>
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification)}
                        className={`w-full border-b border-white/5 px-3 py-2.5 text-start text-sm transition-colors last:border-b-0 hover:bg-white/5 ${
                          notification.isRead ? "text-slate-400" : "text-slate-100"
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          {!notification.isRead ? (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          ) : (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                          )}
                          {notification.message}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
