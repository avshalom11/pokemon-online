interface MasterBallConfirmDialogProps {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Guards the one guaranteed-capture, rare-item ball — same centered
// backdrop overlay idiom as PartySelector/BattleResultOverlay (scoped to
// the battle panel, absolute inset-0). Cancelling closes this with no
// server call ever made, so nothing is consumed; only onConfirm proceeds
// to the real capture attempt (see BattleContent's handleConfirmMasterBall).
export function MasterBallConfirmDialog({ pending, onCancel, onConfirm }: MasterBallConfirmDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <h2 className="text-lg font-bold text-slate-100">שימוש במאסטר בול</h2>
        <p className="mt-3 text-sm text-slate-300">
          המאסטר בול מבטיח לכידה, אך הוא פריט נדיר במיוחד. האם אתה בטוח שברצונך להשתמש בו?
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            השתמש במאסטר בול
          </button>
        </div>
      </div>
    </div>
  );
}
