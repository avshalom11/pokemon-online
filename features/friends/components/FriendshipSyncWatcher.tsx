"use client";

import { useEffect } from "react";

import { useFriendsData } from "@/features/friends/context/friends-data-context";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";

// LIVE FRIEND REMOVAL SYNC — closes the currently-open private-chat window
// the instant its friend is no longer present in the shared `friends` list.
// Purely reactive/derived (no polling of its own) — FriendsDataProvider's
// own background poll is what keeps `friends` current; this component only
// has to notice when that list stops containing whoever the open chat is
// with, which covers BOTH triggers with the exact same check: the local
// user removing the friend themselves (useRemoveFriend's own optimistic
// update already updates `friends` synchronously, so this fires on the
// very next render) and the OTHER side removing it (only ever discovered
// via the next poll tick — this is what actually detects that case, since
// there is no local action to react to). Mounted once alongside
// FloatingPrivateChatWindow inside the (game) layout's provider tree —
// never builds or depends on any server-side presence system.
export function FriendshipSyncWatcher() {
  const { friends } = useFriendsData();
  const { activeConversation, closeChat } = usePrivateChatWindow();

  useEffect(() => {
    if (!activeConversation) return;
    const stillFriends = friends.some((friend) => friend.playerId === activeConversation.friendPlayerId);
    if (!stillFriends) {
      closeChat();
    }
  }, [friends, activeConversation, closeChat]);

  return null;
}
