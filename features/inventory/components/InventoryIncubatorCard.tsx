import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { OwnedIncubatorSummary } from "@/features/eggs/services/incubator-display.service";

interface InventoryIncubatorCardProps {
  incubator: OwnedIncubatorSummary;
  onSell: (incubatorTypeId: string) => void;
  disabled: boolean;
}

// INCUBATOR EXPANSION / INVENTORY SELL — the permanent starter incubator IS
// shown here (never excluded), clearly marked with a "קבוע" (permanent)
// badge instead of a quantity/sell action — it is reusable forever and
// MUST NOT be sellable, per the spec. Every consumable entry gets a sell
// button instead, which sells exactly ONE instance of that type (the
// server picks any one non-active instance — see sell-incubator.service.ts
// for why the grouped display needs no per-instance id here). Placing an
// incubator into use stays exclusively a /hatchery action, this component
// never links there or duplicates that flow.
export function InventoryIncubatorCard({ incubator, onSell, disabled }: InventoryIncubatorCardProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
      <SpriteImage
        src={incubator.imageUrl}
        alt={incubator.displayName}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
      />
      <span className="text-sm font-semibold text-slate-100">{incubator.displayName}</span>
      <span dir="ltr" className="text-[11px] text-slate-400">
        ×{incubator.speedMultiplier} מהירות
      </span>
      {incubator.isPermanent ? (
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">קבוע</span>
      ) : (
        <>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
            × {incubator.quantity}
          </span>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CurrencyIcon type={incubator.sellCurrency} />
            <span dir="ltr">{incubator.sellPrice.toLocaleString("he-IL")}</span>
            <span className="text-emerald-400/80">מחיר מכירה ליחידה</span>
          </span>

          <button
            type="button"
            onClick={() => onSell(incubator.incubatorTypeId)}
            disabled={disabled}
            className="mt-1 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            מכירה
          </button>
        </>
      )}
    </div>
  );
}
