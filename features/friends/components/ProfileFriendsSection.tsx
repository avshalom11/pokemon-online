"use client";

import { useState } from "react";

import { PlayerNameLink } from "@/components/social/PlayerNameLink";
import { useFriendsData } from "@/features/friends/context/friends-data-context";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";

// FRIENDS + PRIVATE CHAT UX — the "חברים" section on the logged-in
// player's OWN profile (ProfileContent.tsx, only rendered when
// view.isOwner — friend management only ever makes sense for your own
// account, never someone else's profile you're merely visiting). Reads
// from the shared FriendsDataProvider (mounted once at the (game) layout
// level) rather than owning its own copy of the data — this is exactly
// what keeps it in sync when a request is accepted/declined from
// elsewhere (the notification bell, the bottom-right Friends bar, another
// player's public profile) without a page reload; see
// friends-data-context.tsx's own doc comment.
//
// Friendship is symmetric — "החברים שלי" lists a friend regardless of
// who originally sent or accepted the request (see friendship.service.ts's
// own getFriendsAndRequests, which already reads "the other side" from
// whichever of requester/addressee isn't the caller); this component never
// re-derives or displays that directional history itself.
//
// "פתח צ׳אט" no longer navigates anywhere — it calls openChat() from the
// shared PrivateChatWindowProvider (mounted once at the (game) layout
// level), which opens the floating bottom-right window while staying on
// this exact page.
export function ProfileFriendsSection() {
  const { friends, incomingRequests, respondToRequest } = useFriendsData();
  const { openChat } = usePrivateChatWindow();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function handleRespond(requestId: string, action: "accept" | "decline") {
    setRespondingId(requestId);
    await respondToRequest(requestId, action);
    setRespondingId(null);
  }

  return (
    <section dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">חברים</h2>

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">בקשות חברות</h3>
          {incomingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">אין בקשות חברות ממתינות.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {incomingRequests.map((request) => (
                <li key={request.requestId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/40 px-3 py-2">
                  <PlayerNameLink
                    username={request.requesterUsername}
                    displayName={request.requesterDisplayName}
                    className="text-sm font-medium text-slate-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={respondingId === request.requestId}
                      onClick={() => handleRespond(request.requestId, "accept")}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      אשר חברות
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === request.requestId}
                      onClick={() => handleRespond(request.requestId, "decline")}
                      className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      לא מאשר
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">החברים שלי</h3>
          {friends.length === 0 ? (
            <p className="text-sm text-slate-500">עדיין אין לך חברים. אפשר להוסיף חברים דרך הפרופיל הציבורי שלהם.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {friends.map((friend) => (
                <li key={friend.playerId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/40 px-3 py-2">
                  <PlayerNameLink username={friend.username} displayName={friend.displayName} className="text-sm font-medium text-slate-100" />
                  <button
                    type="button"
                    onClick={() => openChat(friend.playerId, friend.displayName)}
                    className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
                  >
                    פתח צ׳אט
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
