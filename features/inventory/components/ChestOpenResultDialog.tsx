import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { OpenChestRewardView } from "@/features/chests/types/chest-open.types";

interface ChestOpenResultDialogProps {
  chestDisplayName: string;
  rewards: readonly OpenChestRewardView[];
  onClose: () => void;
}

// CHESTS PHASE 4 — the post-opening reveal, listing EVERY reward from one
// opening — purely presentational, shown once openChestAction already
// resolved successfully server-side (features/chests/actions/open-chest.
// action.ts). Same "no backdrop-click-to-dismiss, one explicit
// acknowledgement button" shell as HatchResultDialog.tsx: a reward reveal
// is a one-time summary, never something dismissible by an accidental
// outside click. Renders directly off Phase 3's own already-enriched
// OpenChestRewardView (features/chests/types/chest-open.types.ts) — every
// display name/image was already resolved server-side against the real,
// existing egg/incubator/Shop catalogs, so this component never
// re-derives or re-maps anything itself, per this phase's own "reuse
// existing image/data, don't hardcode a second map" requirement. A bundle
// (e.g. an evolution-item reward with several distinct items) still
// renders as one reward CATEGORY block, but every distinct item inside it
// gets its own row — never collapsed into a single fake line.
export function ChestOpenResultDialog({ chestDisplayName, rewards, onClose }: ChestOpenResultDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-amber-400/30 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-center text-lg font-bold text-slate-100">{chestDisplayName} נפתחה!</h2>
        <p className="mt-1 text-center text-sm text-slate-300">קיבלת את הפרסים הבאים:</p>

        <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
          {rewards.map((reward, index) => (
            <RewardRows key={index} reward={reward} />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          מעולה!
        </button>
      </div>
    </div>
  );
}

function RewardRows({ reward }: { reward: OpenChestRewardView }) {
  switch (reward.category) {
    case "money":
      return <RewardRow label="כסף" valueText={reward.amount.toLocaleString("he-IL")} currency="money" />;

    case "gold":
      return <RewardRow label="זהב" valueText={reward.amount.toLocaleString("he-IL")} currency="gold" />;

    case "egg":
      return <RewardRow label={reward.displayName} imageUrl={reward.imageUrl} />;

    case "incubator":
      return <RewardRow label={reward.displayName} valueText="×1" imageUrl={reward.imageUrl} />;

    case "poke-balls":
    case "potions":
    case "revive":
      return <RewardRow label={reward.displayName} valueText={`×${reward.quantity}`} imageUrl={reward.imageUrl} />;

    case "evolution-item":
      return (
        <>
          {reward.items.map((item) => (
            <RewardRow key={item.itemId} label={item.displayName} valueText={`×${item.quantity}`} imageUrl={item.imageUrl} />
          ))}
        </>
      );
  }
}

interface RewardRowProps {
  label: string;
  valueText?: string;
  imageUrl?: string;
  currency?: "money" | "gold";
}

function RewardRow({ label, valueText, imageUrl, currency }: RewardRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-2">
      {imageUrl ? (
        <SpriteImage
          src={imageUrl}
          alt={label}
          className="h-10 w-10 shrink-0 object-contain"
          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
      ) : currency ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          <CurrencyIcon type={currency} className="h-6 w-6" />
        </span>
      ) : null}

      <span className="flex-1 text-right text-sm font-semibold text-slate-100">{label}</span>
      {valueText ? (
        <span dir="ltr" className="text-sm font-bold text-emerald-300">
          {valueText}
        </span>
      ) : null}
    </div>
  );
}
