import { SpriteImage } from "@/components/media/SpriteImage";
import { IncubationProgressBar } from "@/features/hatchery/components/IncubationProgressBar";
import type { HatcheryIncubatorView } from "@/features/hatchery/services/hatchery-view.service";

interface IncubatorCardProps {
  incubator: HatcheryIncubatorView;
  isPending: boolean;
  onHatch: (incubationId: string) => void;
}

// INCUBATOR EXPANSION — one owned incubator INSTANCE's own always-visible
// card (HatcheryIncubatorPanel renders one of these per entry in
// HatcheryViewData.incubators). Clearly shows whether it's empty or
// currently holding an egg (never both at once), its speed multiplier, and
// whether it's the player's one permanent/reusable starter incubator or a
// single-use consumable one — same "existence of activeIncubation IS the
// busy/empty state" philosophy the original single-incubator panel already
// established, just per-instance now that a player can own several.
export function IncubatorCard({ incubator, isPending, onHatch }: IncubatorCardProps) {
  const { activeIncubation } = incubator;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SpriteImage
            src={incubator.imageUrl}
            alt={incubator.displayName}
            className="h-10 w-10 object-contain"
            fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{incubator.displayName}</h3>
            <span dir="ltr" className="text-[11px] text-slate-500">
              ×{incubator.speedMultiplier} מהירות
            </span>
          </div>
        </div>

        <span
          className={
            incubator.isPermanent
              ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
              : "rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
          }
        >
          {incubator.isPermanent ? "קבוע" : "חד-פעמי"}
        </span>
      </div>

      {!activeIncubation ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-4 text-center text-sm text-slate-500">
          האינקובטור ריק.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <SpriteImage
              src={activeIncubation.egg.imageUrl}
              alt={activeIncubation.egg.displayName}
              className="h-16 w-16 object-contain"
              fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
            <span className="text-xs font-semibold text-slate-100">{activeIncubation.egg.displayName}</span>
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
