import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { OwnedChestSummary } from "@/features/chests/services/chest-ownership.service";

interface InventoryChestCardProps {
  chest: OwnedChestSummary;
  onOpen: (chestTypeId: OwnedChestSummary["chestTypeId"]) => void;
  onSell: (chest: OwnedChestSummary) => void;
  disabled: boolean;
}

// CHESTS PHASE 4 — one owned chest TYPE's card (only chest types the
// player owns at least one of ever reach this — see chest-ownership.
// service.ts's own listOwnedChests). The "פתח תיבה" button opens a chest,
// same as ever — it only triggers the existing Phase 3 openChestAction,
// never rolls/consumes/grants anything itself.
//
// CHESTS — SELL FROM INVENTORY — the "מכירה" button is a second, entirely
// separate action: it always sells exactly ONE unit at the sell price the
// server already computed (chest.sellPrice/sellCurrency, live off the Shop
// catalog — see chest-ownership.service.ts's own listOwnedChests), same
// "server-side is the real protection, the client button is just disabled
// while pending" division of responsibility InventoryEggCard/
// InventoryIncubatorCard's own sell buttons already establish.
export function InventoryChestCard({ chest, onOpen, onSell, disabled }: InventoryChestCardProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
      <SpriteImage
        src={chest.imageUrl}
        alt={chest.displayName}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
      />
      <span className="text-sm font-semibold text-slate-100">{chest.displayName}</span>
      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">× {chest.quantity}</span>

      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
        <CurrencyIcon type={chest.sellCurrency} />
        <span dir="ltr">{chest.sellPrice.toLocaleString("he-IL")}</span>
        <span className="text-emerald-400/80">מחיר מכירה ליחידה</span>
      </span>

      <button
        type="button"
        onClick={() => onOpen(chest.chestTypeId)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors enabled:hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "פותח..." : "פתח תיבה"}
      </button>

      <button
        type="button"
        onClick={() => onSell(chest)}
        disabled={disabled}
        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        מכירה
      </button>
    </div>
  );
}
