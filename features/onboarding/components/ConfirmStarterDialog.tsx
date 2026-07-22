interface ConfirmStarterDialogProps {
  speciesName: string;
  pending: boolean;
  onCancel: () => void;
}

// Rendered inside the selection <form> (StarterSelectionGrid) — the confirm
// button is type="submit" so accepting here is what actually calls the
// server action; this component itself has no submission logic of its own.
export function ConfirmStarterDialog({ speciesName, pending, onCancel }: ConfirmStarterDialogProps) {
  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-900 p-6 text-center shadow-xl">
        <p className="mb-6 text-slate-100">
          האם אתה בטוח שברצונך לבחור ב{speciesName}? לא ניתן יהיה לשנות בחירה זו מאוחר יותר.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "שומר..." : "אישור"}
          </button>
        </div>
      </div>
    </div>
  );
}
