import { SpriteImage } from "@/components/media/SpriteImage";
import type { HatcheryIncubatorView } from "@/features/hatchery/services/hatchery-view.service";

interface IncubatorPickerDialogProps {
  emptyIncubators: HatcheryIncubatorView[];
  onSelect: (incubatorId: string) => void;
  onCancel: () => void;
  disabled: boolean;
}

// INCUBATOR EXPANSION — the explicit choice the player makes about WHICH
// owned (currently empty) incubator receives an egg, opened from
// HatcheryEggCard's own "הכנס לאינקובטור" button. Deliberately never
// auto-picks the fastest/first incubator (the spec's own requirement) —
// every empty instance is listed, in the same permanent-first / acquisition
// order HatcheryIncubatorPanel already shows them in, and the player's own
// click is what decides.
export function IncubatorPickerDialog({ emptyIncubators, onSelect, onCancel, disabled }: IncubatorPickerDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-100">בחר אינקובטור</h2>
        <p className="mt-1 text-xs text-slate-400">לאיזה אינקובטור להכניס את הביצה?</p>

        <div className="mt-4 flex flex-col gap-2">
          {emptyIncubators.map((incubator) => (
            <button
              key={incubator.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(incubator.id)}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-3 text-right transition-colors enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SpriteImage
                src={incubator.imageUrl}
                alt={incubator.displayName}
                className="h-10 w-10 object-contain"
                fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-100">{incubator.displayName}</span>
                <span dir="ltr" className="block text-[11px] text-slate-400">
                  ×{incubator.speedMultiplier} מהירות · {incubator.isPermanent ? "קבוע" : "חד-פעמי"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
