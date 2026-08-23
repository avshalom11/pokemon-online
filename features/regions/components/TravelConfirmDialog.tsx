import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";
import { REGION_LABELS } from "@/shared/types/region-labels";
import type { RegionId } from "@/shared/types/region";

interface TravelConfirmDialogProps {
  regionId: RegionId;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// REGION TRAVEL COST — shown BEFORE anything is charged, opened by
// WorldContent.tsx the moment a player clicks a DIFFERENT (non-active)
// region card; never opened for the already-active region. The price
// shown here is read straight from the same central
// region-travel-cost.config.ts the server itself resolves the real charge
// from — display-only, never sent back to the server (selectRegionAction
// only ever receives `regionId`; the server independently re-resolves the
// price itself, see that action's own doc comment). Cancel only ever
// closes this dialog (onCancel is a plain state setter in the parent, no
// server call reachable from it at all) — no Money is ever deducted and
// no region change happens unless "עבור למחוז" is explicitly pressed.
export function TravelConfirmDialog({ regionId, isPending, onCancel, onConfirm }: TravelConfirmDialogProps) {
  const cost = getRegionTravelCost(regionId);
  const label = REGION_LABELS[regionId];

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        <h2 className="text-center text-lg font-bold text-slate-100">מעבר מחוז</h2>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-center text-sm leading-relaxed text-slate-300">
          <span>מעבר ל{label} יעלה לך</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-100">
            <CurrencyIcon type="money" className="h-4 w-4" />
            {cost.toLocaleString("he-IL")}
          </span>
          <span>כסף.</span>
        </p>
        <p className="mt-1 text-center text-sm text-slate-300">האם ברצונך לעבור?</p>

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "מעביר..." : "עבור למחוז"}
          </button>
        </div>
      </div>
    </div>
  );
}
