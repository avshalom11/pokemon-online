"use client";

interface RemoveFriendConfirmationProps {
  friendName: string;
  onConfirm: () => void;
  onCancel: () => void;
  // Disables both buttons while the removal request is in flight — never
  // lets a second click fire a duplicate removeFriendAction call.
  isBusy?: boolean;
}

// REMOVE FRIEND — the one shared confirmation dialog for both places a
// friendship can be ended (the red ✕ in FriendsBar.tsx, and "הפסק חברות"
// on a friend's public profile via AddFriendButton.tsx) — never a second,
// duplicated confirmation implementation, and never the browser's own
// native confirm dialog: same modal chrome (fixed inset-0 backdrop,
// rounded card) every other dialog in this codebase already uses
// (EditProfileModal.tsx, PlayerSearchModal.tsx).
// Purely presentational — the caller owns both the open/closed state and
// what actually happens on confirm (always the shared useRemoveFriend hook
// in practice, never duplicated logic here).
export function RemoveFriendConfirmation({ friendName, onConfirm, onCancel, isBusy }: RemoveFriendConfirmationProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)]"
      >
        <p className="text-sm text-slate-100">האם אתה בטוח שברצונך להפסיק את החברות עם {friendName}?</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-white/10 bg-slate-800/70 px-4 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
