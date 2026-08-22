"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getFriendsAndRequestsAction, removeFriendAction, respondToFriendRequestAction } from "@/features/friends/actions/friendship.actions";
import { FRIENDS_DATA_POLL_INTERVAL_MS } from "@/features/friends/config/friends.config";
import type { FriendsAndRequestsView, FriendSummary, PendingFriendRequestView } from "@/features/friends/types";

interface FriendsDataContextValue {
  friends: FriendSummary[];
  incomingRequests: PendingFriendRequestView[];
  // Re-fetches from the server and replaces both lists — the reconciliation
  // path every mutation below falls back to on failure, and what a
  // successful auto-accepted send (sendFriendRequestAction returning
  // autoAccepted: true — see AddFriendButton.tsx) triggers to pick up the
  // new friend it didn't go through respondToRequest for.
  refresh: () => Promise<void>;
  // THE one accept/decline call site for the whole app — NotificationBell's
  // own inline אשר/לא מאשר, ProfileFriendsSection's own list, and
  // AddFriendButton's pending-incoming branch (on another player's public
  // profile) all call this instead of respondToFriendRequestAction
  // directly, so there is exactly one place that both invokes it AND keeps
  // every other friends-UI surface (the bottom-right Friends bar included)
  // in sync — never a second, duplicated friendship implementation, and
  // never a surface that silently goes stale after another surface acts.
  // Returns whether the server actually accepted the response.
  respondToRequest: (requestId: string, action: "accept" | "decline") => Promise<boolean>;
  // REMOVE FRIEND — the one call site for both places that can end a
  // friendship (the red ✕ in the Friends bar, "הפסק חברות" on a friend's
  // public profile — both via the shared useRemoveFriend hook, never a
  // duplicated implementation). Removes the friend from `friends`
  // immediately on success; does NOT know about (or close) any open
  // private-chat window itself — useRemoveFriend is what coordinates that,
  // since this context has no reason to depend on PrivateChatWindowContext.
  removeFriend: (friendPlayerId: string) => Promise<boolean>;
}

const FriendsDataContext = createContext<FriendsDataContextValue | null>(null);

interface FriendsDataProviderProps {
  // Seeded from getFriendsAndRequests via app/(game)/layout.tsx — correct
  // for a hard refresh or the first paint of any page; every mutation below
  // updates this same client-side state afterward, and client-side
  // navigation never re-fetches it (the layout segment isn't re-rendered),
  // so `refresh()` is what keeps it honest against server truth when an
  // optimistic update might have diverged.
  initial: FriendsAndRequestsView;
  children: ReactNode;
}

// FRIENDS QUICK ACTIONS — the one shared friends-list/incoming-requests
// store every friends-UI surface reads from and mutates through, mounted
// once at the (game) layout level (same "provider survives client-side
// navigation because the layout itself never remounts" pattern
// PrivateChatWindowProvider already establishes). This is what makes
// "accept a request from the notification bell" instantly show up in the
// bottom-right Friends bar AND the Profile page's own חברים section
// without a page reload — they're not three separate copies of this data,
// they're three consumers of this one context.
//
// LIVE FRIEND REMOVAL SYNC — every mutation above (respondToRequest,
// removeFriend) only ever reflects changes THIS client itself made. The
// background poll below is what catches everything else: most importantly,
// the OTHER side of a friendship removing it — this client has no local
// action to optimistically react to, so without polling it would only ever
// find out on the next full page load. Same lightweight setInterval +
// server-action pattern (and cadence) Global Chat/Private Chat already use
// — no WebSockets, no new realtime subsystem. FriendshipSyncWatcher.tsx is
// the one place that reacts to a friend actually DISAPPEARING from this
// list (closing an open chat with them) — this provider only ever owns the
// data itself, never any cross-context side effect.
export function FriendsDataProvider({ initial, children }: FriendsDataProviderProps) {
  const [friends, setFriends] = useState<FriendSummary[]>(initial.friends);
  const [incomingRequests, setIncomingRequests] = useState<PendingFriendRequestView[]>(initial.incomingRequests);

  async function refresh() {
    const fresh = await getFriendsAndRequestsAction();
    setFriends(fresh.friends);
    setIncomingRequests(fresh.incomingRequests);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, FRIENDS_DATA_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // Intentionally empty deps, same convention useGlobalChat/usePrivateChat
    // already establish for their own poll loops: `refresh` only ever
    // calls the server action and the (stable-identity) setters, so it
    // never closes over anything that can go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respondToRequest(requestId: string, action: "accept" | "decline"): Promise<boolean> {
    const request = incomingRequests.find((incoming) => incoming.requestId === requestId);

    // Optimistic: removes the request immediately, and — on accept — adds
    // the new friend using the data already on hand from the pending
    // request itself, so the Friends bar/Profile section update the
    // instant the click happens rather than waiting on the round trip.
    setIncomingRequests((current) => current.filter((incoming) => incoming.requestId !== requestId));
    if (action === "accept" && request) {
      setFriends((current) => [
        ...current,
        {
          playerId: request.requesterPlayerId,
          displayName: request.requesterDisplayName,
          username: request.requesterUsername,
          // ONLINE PRESENCE — unknown at this optimistic instant; the
          // background poll's next tick (refresh(), same effect this file
          // already runs every FRIENDS_DATA_POLL_INTERVAL_MS) corrects this
          // to the real value within seconds, same as every other
          // optimistic-then-reconciled field this provider already has.
          isOnline: false,
        },
      ]);
    }

    const result = await respondToFriendRequestAction(requestId, action);
    if (!result.ok) {
      // Already resolved elsewhere, or a genuine failure — either way,
      // real server state is the only trustworthy source to reconcile
      // against now, never a guess.
      await refresh();
      return false;
    }
    return true;
  }

  async function removeFriend(friendPlayerId: string): Promise<boolean> {
    const previousFriends = friends;
    // Optimistic: the friend disappears from every consumer immediately.
    setFriends((current) => current.filter((friend) => friend.playerId !== friendPlayerId));

    const result = await removeFriendAction(friendPlayerId);
    if (!result.ok) {
      // Reconcile against real server state rather than assuming the
      // optimistic removal was correct (e.g. a race where the friendship
      // was already removed from the other side).
      setFriends(previousFriends);
      await refresh();
      return false;
    }
    return true;
  }

  return (
    <FriendsDataContext.Provider value={{ friends, incomingRequests, refresh, respondToRequest, removeFriend }}>
      {children}
    </FriendsDataContext.Provider>
  );
}

export function useFriendsData(): FriendsDataContextValue {
  const context = useContext(FriendsDataContext);
  if (!context) {
    throw new Error("useFriendsData must be used within a FriendsDataProvider");
  }
  return context;
}
