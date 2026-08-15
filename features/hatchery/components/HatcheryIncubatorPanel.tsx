import { SpriteImage } from "@/components/media/SpriteImage";
import { IncubationProgressBar } from "@/features/hatchery/components/IncubationProgressBar";
import type { HatcheryActiveIncubationView } from "@/features/hatchery/services/hatchery-view.service";

interface HatcheryIncubatorPanelProps {
  incubatorDisplayName: string;
  activeIncubation: HatcheryActiveIncubationView | null;
  isPending: boolean;
  onHatch: (incubationId: string) => void;
}

// The incubator's own always-visible card — clearly shows whether it's
// empty or currently holding an egg (never both at once, and never a
// separate "is it busy" flag beyond activeIncubation being null/non-null).
// The incubator itself (its id/type/permanence) is never rendered as
// "consumable" here — hatching only ever clears activeIncubation, the
// panel/card for the incubator stays exactly as-is before and after.
export function HatcheryIncubatorPanel({
  incubatorDisplayName,
  activeIncubation,
  isPending,
  onHatch,
}: HatcheryIncubatorPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold text-slate-200">{incubatorDisplayName}</h2>

      {!activeIncubation ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-4 text-center text-sm text-slate-500">
          האינקובטור ריק. בחר ביצה מהרשימה למטה כדי להתחיל בדגירה.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <SpriteImage
              src={activeIncubation.egg.imageUrl}
              alt={activeIncubation.egg.displayName}
              className="h-20 w-20 object-contain"
              fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
            <span className="text-sm font-semibold text-slate-100">{activeIncubation.egg.displayName}</span>
            <span className="text-[11px] text-slate-400">{activeIncubation.egg.regionLabel}</span>
          </div>

          <div className="min-w-0 flex-1">
            <IncubationProgressBar
              battleProgress={activeIncubation.battleProgress}
              requiredBattleTarget={activeIncubation.requiredBattleTarget}
            />

            {activeIncubation.isReady ? (
              <div className="mt-3 flex flex-col items-center gap-2 sm:items-start">
                <span className="text-sm font-bold text-emerald-300">מוכנה לבקיעה</span>
                <button
                  type="button"
                  onClick={() => onHatch(activeIncubation.incubationId)}
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "בוקעת..." : "בקע ביצה"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
