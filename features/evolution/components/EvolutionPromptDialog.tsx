import { SpriteImage } from "@/components/media/SpriteImage";
import {
  evolutionPromptMessage,
  evolutionPromptTitle,
  evolutionRejectWarning,
} from "@/features/evolution/messages/evolution-messages";
import type { PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";

interface EvolutionPromptDialogProps {
  pending: PendingEvolutionView;
  isSubmitting: boolean;
  onAccept: () => void;
  onReject: () => void;
}

// The evolution decision modal — shared by both surfaces that can show it
// (the in-battle prompt in BattleContent, and the Home-page safety net via
// PendingEvolutionGate for a decision left unresolved when the player
// navigated away). Purely presentational: takes an already-resolved
// PendingEvolutionView and two callbacks, never fetches or mutates
// anything itself.
//
// Deliberately has no backdrop-click-to-dismiss and no ✕ close button —
// per this phase's own "do not allow accidental dismissal" / "the player
// must explicitly choose Yes or No" rule, the only two ways out of this
// dialog are its own two buttons.
export function EvolutionPromptDialog({ pending, isSubmitting, onAccept, onReject }: EvolutionPromptDialogProps) {
  const currentName = pending.nickname ?? pending.currentSpecies.name;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{evolutionPromptTitle}</h2>

        <div className="mt-4 flex items-center justify-center gap-4">
          <SpriteImage
            src={getFrontSpritePath(pending.currentSpecies.dexNumber)}
            alt={pending.currentSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
          <span className="text-2xl text-indigo-300" aria-hidden="true">
            ←
          </span>
          <SpriteImage
            src={getFrontSpritePath(pending.evolvedSpecies.dexNumber)}
            alt={pending.evolvedSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">
          {evolutionPromptMessage(currentName, pending.evolvedSpecies.name)}
        </p>

        <p className="mt-3 text-xs font-semibold text-rose-400">{evolutionRejectWarning}</p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            לא, הישאר כפי שאתה
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            כן, התפתח
          </button>
        </div>
      </div>
    </div>
  );
}
