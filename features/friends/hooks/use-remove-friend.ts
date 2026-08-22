"use client";

import { useFriendsData } from "@/features/friends/context/friends-data-context";
import { usePrivateChatWindow } from "@/features/friends/context/private-chat-window-context";

// REMOVE FRIEND — the one shared hook both removal entry points (the red ✕
// row button in FriendsBar.tsx, and "הפסק חברות" on a friend's public
// profile via AddFriendButton.tsx) call, so there is exactly one place that
// combines "actually remove the friendship" (FriendsDataProvider's own
// removeFriend — which is itself the one call site of removeFriendAction)
// with "close the private-chat window if it happens to be open with this
// exact friend" (this feature's own explicit requirement — see
// PrivateChatWindowProvider's own closeChat). Neither context needs to know
// about the other; this hook is the coordination point between them.
export function useRemoveFriend() {
  const { removeFriend } = useFriendsData();
  const { activeConversation, closeChat } = usePrivateChatWindow();

  async function removeFriendAndCloseChatIfOpen(friendPlayerId: string): Promise<boolean> {
    const ok = await removeFriend(friendPlayerId);
    if (ok && activeConversation?.friendPlayerId === friendPlayerId) {
      closeChat();
    }
    return ok;
  }

  return { removeFriendAndCloseChatIfOpen };
}
