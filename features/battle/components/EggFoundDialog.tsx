import { SpriteImage } from "@/components/media/SpriteImage";

interface EggFoundDialogProps {
  eggDisplayName: string;
  rarityLabel: string;
  imageUrl: string;
  message: string;
  onConfirm: () => void;
}

// EGG DROP — CONFIRMATION DIALOG. The blocking "egg found" confirmation
// shown after a field-battle victory drops an egg (features/battle-session/
// services/battle-session.service.ts's BattleVictoryReward.egg). Same
// "opaque fixed-inset backdrop actually blocks interaction, not a battle-
// phase change" pattern this project's own ChestFoundDialog already
// establishes — the normal post-battle flow (next encounter / return to
// map) already runs underneath; this dialog only needs the player's
// explicit "אישור" to dismiss itself. Never auto-incubates the egg and
// never navigates to Hatchery — that stays exclusively an Inventory/
// Hatchery action, triggered later by the player's own choice.
export function EggFoundDialog({ eggDisplayName, rarityLabel, imageUrl, message, onConfirm }: EggFoundDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-sky-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">מצאת {eggDisplayName}!</h2>
        <p className="mt-1 text-xs font-semibold text-sky-300">נדירות: {rarityLabel}</p>

        <div className="mt-4 flex justify-center">
          <SpriteImage
            src={imageUrl}
            alt={eggDisplayName}
            className="h-24 w-24 object-contain"
            fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">{message}</p>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
