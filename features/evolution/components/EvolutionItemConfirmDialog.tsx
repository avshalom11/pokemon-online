import { SpriteImage } from "@/components/media/SpriteImage";
import { evolutionItemPromptMessage, evolutionPromptTitle } from "@/features/evolution/messages/evolution-messages";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonSpecies } from "@/shared/types/pokemon";

interface EvolutionItemConfirmDialogProps {
  currentSpecies: PokemonSpecies;
  nickname: string | null;
  evolvedSpecies: PokemonSpecies;
  itemName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// The Evolution-Item confirmation modal — same dialog style/shell as
// EvolutionPromptDialog (level evolution): no backdrop-click-to-dismiss, no
// ✕ close button, only its own two buttons ever close it, because "the
// player must explicitly choose" applies here too. Deliberately has no
// reject-warning counterpart (evolutionRejectWarning) — cancelling an
// evolution-item evolution is never permanent (see this feature's own
// spec), so there is nothing equivalent to warn about. Takes the resolved
// current/evolved species directly (rather than an EvolutionItemCandidate)
// so a branch item (Clamperl + Water Stone) can pass in whichever target
// the player already chose via EvolutionItemBranchChoiceDialog — this
// dialog's own job is only the final confirm, never the choice itself.
export function EvolutionItemConfirmDialog({
  currentSpecies,
  nickname,
  evolvedSpecies,
  itemName,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: EvolutionItemConfirmDialogProps) {
  const currentName = nickname ?? currentSpecies.name;

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
            src={getFrontSpritePath(currentSpecies)}
            alt={currentSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
          <span className="text-2xl text-indigo-300" aria-hidden="true">
            ←
          </span>
          <SpriteImage
            src={getFrontSpritePath(evolvedSpecies)}
            alt={evolvedSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">
          {evolutionItemPromptMessage(currentName, evolvedSpecies.name, itemName)}
        </p>

        {errorMessage ? <p className="mt-3 text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
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
