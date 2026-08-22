"use client";

import { useState } from "react";

import { sendFriendRequestAction } from "@/features/friends/actions/friendship.actions";
import { RemoveFriendConfirmation } from "@/features/friends/components/RemoveFriendConfirmation";
import { useFriendsData } from "@/features/friends/context/friends-data-context";
import { useRemoveFriend } from "@/features/friends/hooks/use-remove-friend";
import type { FriendshipStatus, SendFriendRequestError } from "@/features/friends/types";

interface AddFriendButtonProps {
  targetPlayerId: string;
  // REMOVE FRIEND — the name shown in RemoveFriendConfirmation's own
  // message when this profile's owner is already a friend.
  targetDisplayName: string;
  initialStatus: FriendshipStatus;
  // Non-null exactly when initialStatus is "pending-incoming" — see
  // PublicProfileView's own doc comment (profile.types.ts).
  incomingFriendRequestId: string | null;
}

const ERROR_LABELS: Record<SendFriendRequestError, string> = {
  unauthenticated: "יש להתחבר כדי לשלוח בקשת חברות",
  self: "לא ניתן לשלוח בקשת חברות לעצמך",
  "already-pending": "בקשת חברות כבר נשלחה",
  "already-friends": "אתם כבר חברים",
  "not-found": "השחקן לא נמצא",
};

// FRIENDS PHASE 1 + UX — rendered on another player's public profile
// (ProfileHeader.tsx, only when view.friendshipStatus !== "self"). Starts
// from the server-resolved `initialStatus` (never guessed client-side) and
// only ever moves it forward optimistically after a successful
// send/accept/decline. Accept/decline goes through the shared
// FriendsDataProvider's own respondToRequest (friends-data-context.tsx) —
// the SAME single call site NotificationBell.tsx and ProfileFriendsSection
// use — so this button's own state AND every other friends-UI surface
// (the bottom-right Friends bar, a mounted Profile page) update together,
// never a second, duplicated friendship implementation.
export function AddFriendButton({ targetPlayerId, targetDisplayName, initialStatus, incomingFriendRequestId }: AddFriendButtonProps) {
  const { respondToRequest, refresh } = useFriendsData();
  const { removeFriendAndCloseChatIfOpen } = useRemoveFriend();
  const [status, setStatus] = useState(initialStatus);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  if (status === "self") return null;

  if (status === "friends") {
    async function handleConfirmRemove() {
      setIsBusy(true);
      const ok = await removeFriendAndCloseChatIfOpen(targetPlayerId);
      setIsBusy(false);
      setIsConfirmingRemove(false);
      if (ok) setStatus("none");
    }

    return (
      <div className="mt-2 flex flex-col items-center gap-1 sm:items-start">
        <button
          type="button"
          onClick={() => setIsConfirmingRemove(true)}
          className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:border-rose-400/70 hover:bg-rose-500/20"
        >
          הפסק חברות
        </button>
        {isConfirmingRemove ? (
          <RemoveFriendConfirmation
            friendName={targetDisplayName}
            onConfirm={handleConfirmRemove}
            onCancel={() => setIsConfirmingRemove(false)}
            isBusy={isBusy}
          />
        ) : null}
      </div>
    );
  }

  if (status === "pending-outgoing") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-200">
        בקשת חברות נשלחה
      </span>
    );
  }

  if (status === "pending-incoming" && incomingFriendRequestId) {
    async function handleRespond(action: "accept" | "decline") {
      setIsBusy(true);
      setError(null);
      const ok = await respondToRequest(incomingFriendRequestId!, action);
      setIsBusy(false);
      if (!ok) {
        setError("משהו השתבש, נסו שוב");
        return;
      }
      setStatus(action === "accept" ? "friends" : "none");
    }

    return (
      <div className="mt-2 flex flex-col items-center gap-1 sm:items-start">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">שלח/ה לך בקשת חברות</span>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleRespond("accept")}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            אשר חברות
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleRespond("decline")}
            className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            לא מאשר
          </button>
        </div>
        {error ? <span className="text-[11px] text-rose-400">{error}</span> : null}
      </div>
    );
  }

  async function handleSend() {
    setIsBusy(true);
    setError(null);
    const result = await sendFriendRequestAction(targetPlayerId);
    setIsBusy(false);

    if (!result.ok) {
      setError(ERROR_LABELS[result.error]);
      return;
    }
    setStatus(result.autoAccepted ? "friends" : "pending-outgoing");
    // The auto-accept path forms a real friendship this button's own send
    // action never routed through respondToRequest for — refresh() is what
    // syncs that new friend into the shared Friends bar/Profile section.
    if (result.autoAccepted) {
      refresh();
    }
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-1 sm:items-start">
      <button
        type="button"
        onClick={handleSend}
        disabled={isBusy}
        className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-200 transition-colors hover:border-indigo-400/70 hover:bg-indigo-500/20 disabled:opacity-50"
      >
        הוסף כחבר
      </button>
      {error ? <span className="text-[11px] text-rose-400">{error}</span> : null}
    </div>
  );
}
