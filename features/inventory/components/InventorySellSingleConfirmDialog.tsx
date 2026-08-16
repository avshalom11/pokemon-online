import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { CurrencyType } from "@/features/currency/types/currency.types";

interface InventorySellSingleConfirmDialogProps {
  imageUrl: string;
  name: string;
  sellPrice: number;
  currency: CurrencyType;
  pending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// INVENTORY SELL (eggs/incubators) — same centered fixed-overlay idiom as
// InventorySellConfirmDialog, simplified for the one-instance-at-a-time
// sale an egg or a grouped consumable-incubator entry always is: no
// quantity stepper (always exactly 1), since neither an egg nor a single
// incubator instance is a stackable ShopItem quantity the way an ordinary
// Inventory item is. A rejected sale surfaces its message right here
// instead of closing the dialog, same as every other confirm dialog in
// this project.
export function InventorySellSingleConfirmDialog({
  imageUrl,
  name,
  sellPrice,
  currency,
  pending,
  errorMessage,
  onCancel,
  onConfirm,
}: InventorySellSingleConfirmDialogProps) {
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
        className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <SpriteImage
          src={imageUrl}
          alt={name}
          className="mx-auto h-20 w-20 object-contain"
          fallbackClassName="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />

        <h2 className="mt-3 text-lg font-bold text-slate-100">{name}</h2>

        <dl className="mt-4 space-y-1.5 text-sm text-slate-300">
          <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
            <dt className="text-slate-400">{'תמורה למכירה'}</dt>
            <dd className="flex items-center gap-1.5 font-bold text-emerald-300">
              <CurrencyIcon type={currency} />
              <span dir="ltr">{sellPrice.toLocaleString("he-IL")}</span>
            </dd>
          </div>
        </dl>

        {errorMessage ? <p className="mt-4 text-sm font-semibold text-rose-400">{errorMessage}</p> : null}

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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "מוכר..." : "אישור מכירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
