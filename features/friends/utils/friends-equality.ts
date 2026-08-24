import type { FriendSummary, PendingFriendRequestView } from "@/features/friends/types";

// SITE RENDER PERFORMANCE — every poll tick fetches a FRESH array/object
// graph over the wire (a Server Action response is never referentially
// equal to the previous read, even when nothing actually changed), so
// FriendsDataProvider blindly calling setFriends/setIncomingRequests with it
// on every tick was forcing the provider — and therefore every consumer of
// its context value (NotificationBell, FriendsBar, FriendshipSyncWatcher,
// ...) — to rerender every FRIENDS_DATA_POLL_INTERVAL_MS regardless of
// whether the friend list actually changed. These do a plain field-by-field
// content comparison (small view models, cheap to compare in full) so
// refresh() can bail out — via the setState functional-updater "return the
// same reference" pattern, which React treats as a no-op — whenever the
// fresh read is equivalent to what's already in state. Kept as their own
// plain .ts module (not inline in the .tsx context file) so this pure logic
// stays directly unit-testable without a React-render/DOM harness, same
// "one small pure-logic file per feature" precedent presence.config.ts's
// own isOnline already establishes.
export function friendsEqual(a: FriendSummary[], b: FriendSummary[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((friend, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      friend.playerId === other.playerId &&
      friend.displayName === other.displayName &&
      friend.username === other.username &&
      friend.isOnline === other.isOnline
    );
  });
}

export function incomingRequestsEqual(a: PendingFriendRequestView[], b: PendingFriendRequestView[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((request, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      request.requestId === other.requestId &&
      request.requesterPlayerId === other.requesterPlayerId &&
      request.requesterDisplayName === other.requesterDisplayName &&
      request.requesterUsername === other.requesterUsername
    );
  });
}
