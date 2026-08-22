"use client";

import { useState } from "react";

import { OnlineStatusDot } from "@/components/social/OnlineStatusDot";
import {
  CHAT_ACCENT_BORDER_COLOR_CLASSNAME,
  CHAT_HEADER_BG_CLASSNAME,
  CHAT_PANEL_BG_CLASSNAME,
  CHAT_PANEL_BORDER_CLASSNAME,
} from "@/features/chat/components/chat-theme";
import { RemoveFriendConfirmation } from "@/features/friends/components/RemoveFriendConfirmation";
import { useFriendsData } from "@/features/friends/context/friends-data-context";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";
import { useRemoveFriend } from "@/features/friends/hooks/use-remove-friend";

// FRIENDS UI — MINIMIZED CHAT POSITION FIX. This component no longer
// self-positions at all — it's rendered as a plain flex child of
// SocialDock (features/friends/components/SocialDock.tsx), which is the
// ONE place bottom-right fixed positioning/z-index for the social panels
// now lives. That's what guarantees this bar stays the right-most social
// element regardless of its own or Private Chat's current collapsed/
// expanded state — see SocialDock's own doc comment for the full
// reasoning (and the bug this replaced: a hardcoded rem-offset sized for
// this bar's EXPANDED width, wrong whenever it was collapsed instead).
//
// FRIENDS QUICK ACTIONS — the persistent "חברים" control, mounted once by
// app/(game)/layout.tsx (inside SocialDock) so it — and its own
// minimize/expand state — survives every client-side navigation. Reads
// accepted friends ONLY from the shared FriendsDataProvider (never its own
// fetch), so accepting a request anywhere (the notification bell, the
// Profile page, another player's public profile) shows up here
// immediately, no page reload — and removing a friend here or on their
// profile removes them from this list immediately too, via the same
// shared context. FriendsDataProvider's own polling (LIVE FRIEND REMOVAL
// SYNC) is also what removes a friend from this list automatically when
// the OTHER side ends the friendship, with no page reload needed.
export function FriendsBar() {
  const { friends } = useFriendsData();
  const { openChat } = usePrivateChatWindow();
  const { removeFriendAndCloseChatIfOpen } = useRemoveFriend();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{ playerId: string; displayName: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleConfirmRemove() {
    if (!pendingRemoval) return;
    setIsRemoving(true);
    await removeFriendAndCloseChatIfOpen(pendingRemoval.playerId);
    setIsRemoving(false);
    setPendingRemoval(null);
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        dir="rtl"
        onClick={() => setIsExpanded(true)}
        aria-label="הרחב את רשימת החברים"
        className={`flex items-center gap-2 rounded-full border ${CHAT_ACCENT_BORDER_COLOR_CLASSNAME} ${CHAT_HEADER_BG_CLASSNAME} px-4 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:bg-indigo-900/60`}
      >
        <span aria-hidden="true">👥</span>
        חברים
      </button>
    );
  }

  return (
    <>
      <div
        dir="rtl"
        className={`flex h-80 max-h-[60vh] w-72 max-w-[90vw] flex-col overflow-hidden rounded-2xl ${CHAT_PANEL_BORDER_CLASSNAME} ${CHAT_PANEL_BG_CLASSNAME} shadow-2xl backdrop-blur-md`}
      >
        <div className={`flex items-center justify-between px-3 py-2 ${CHAT_HEADER_BG_CLASSNAME}`}>
          <span className="text-sm font-semibold text-slate-100">חברים</span>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="מזער את רשימת החברים"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">▾</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {friends.length === 0 ? (
            <p className="flex h-full items-center justify-center text-center text-sm text-slate-400">עדיין אין לך חברים.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {friends.map((friend) => (
                <li key={friend.playerId} className="flex items-center gap-1 rounded-lg hover:bg-white/5">
                  {/* Clicking the friend's name opens the existing private
                      chat window (this feature's own explicit spec) — NOT a
                      profile link here, unlike every other PlayerNameLink
                      use elsewhere in the app. The remove ✕ below is a
                      SIBLING button, never nested inside this one — that's
                      the "appropriate button structure" that makes it
                      impossible for removing to also open chat, no
                      stopPropagation needed. */}
                  <button
                    type="button"
                    onClick={() => openChat(friend.playerId, friend.displayName)}
                    className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-right"
                  >
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                      {friend.displayName.trim().charAt(0).toUpperCase() || "?"}
                      <OnlineStatusDot
                        isOnline={friend.isOnline}
                        className="absolute -bottom-0.5 -end-0.5 ring-2 ring-slate-900"
                      />
                    </span>
                    <span className="text-sm font-medium text-slate-100">{friend.displayName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRemoval({ playerId: friend.playerId, displayName: friend.displayName })}
                    aria-label={`הפסק חברות עם ${friend.displayName}`}
                    title={`הפסק חברות עם ${friend.displayName}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rose-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pendingRemoval ? (
        <RemoveFriendConfirmation
          friendName={pendingRemoval.displayName}
          onConfirm={handleConfirmRemove}
          onCancel={() => setPendingRemoval(null)}
          isBusy={isRemoving}
        />
      ) : null}
    </>
  );
}
