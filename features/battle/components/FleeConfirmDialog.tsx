interface FleeConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

// Guards the "בריחה" menu action — same centered backdrop overlay idiom as
// MasterBallConfirmDialog (scoped to the battle panel, absolute inset-0).
// Cancelling closes this with no server call ever made and the player stays
// in battle exactly as before; only onConfirm proceeds to the real escape
// (see BattleContent's handleConfirmFlee/handleEscape).
export function FleeConfirmDialog({ onCancel, onConfirm }: FleeConfirmDialogProps) {
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
        className="w-full max-w-sm rounded-2xl border border-slate-400/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <h2 className="text-lg font-bold text-slate-100">לברוח מהקרב?</h2>
        <p className="mt-3 text-sm text-slate-300">האם אתה בטוח שברצונך לברוח מהקרב הנוכחי?</p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            ברח
          </button>
        </div>
      </div>
    </div>
  );
}
