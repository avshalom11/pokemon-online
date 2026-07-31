import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface ShopPurchaseConfirmDialogProps {
  item: ShopItem;
  quantity: number;
  pending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// Step 4/5 of the shopping flow (see ShopContent's own doc comment) — same
// centered fixed-overlay idiom as ReleaseConfirmDialog/ConfirmStarterDialog,
// showing everything the flow requires before a purchase is confirmed: item
// image, name, quantity, price per item, total price, and the currency icon
// it will be paid in. A rejected purchase (insufficient funds, or any other
// server-side rejection) surfaces its message right here instead of closing
// the dialog, so the player immediately sees why and can adjust quantity
// without re-opening it.
export function ShopPurchaseConfirmDialog({
  item,
  quantity,
  pending,
  errorMessage,
  onCancel,
  onConfirm,
}: ShopPurchaseConfirmDialogProps) {
  const totalPrice = item.price * quantity;

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
        className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <SpriteImage
          src={item.imageUrl}
          alt={item.name}
          className="mx-auto h-20 w-20 object-contain"
          fallbackClassName="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />

        <h2 className="mt-3 text-lg font-bold text-slate-100">{item.name}</h2>

        <dl className="mt-4 space-y-1.5 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">כמות</dt>
            <dd dir="ltr" className="font-semibold text-slate-100">
              {quantity}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">מחיר ליחידה</dt>
            <dd className="flex items-center gap-1.5 font-semibold text-slate-100">
              <CurrencyIcon type={item.currency} />
              <span dir="ltr">{item.price.toLocaleString("he-IL")}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
            <dt className="text-slate-400">{'סה"כ לתשלום'}</dt>
            <dd className="flex items-center gap-1.5 font-bold text-slate-100">
              <CurrencyIcon type={item.currency} />
              <span dir="ltr">{totalPrice.toLocaleString("he-IL")}</span>
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "קונה..." : "אישור קנייה"}
          </button>
        </div>
      </div>
    </div>
  );
}
