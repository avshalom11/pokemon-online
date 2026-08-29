import { SpriteImage } from "@/components/media/SpriteImage";
import { tmUseCancelButtonLabel, tmUseConfirmButtonLabel, tmUseConfirmMessage } from "@/features/tm-system/messages/tm-use-messages";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonSpecies } from "@/shared/types/pokemon";

interface TmUseConfirmDialogProps {
  species: PokemonSpecies;
  nickname: string | null;
  moveName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// The "simple add" confirmation — shown only when the chosen Pokémon has
// fewer than 4 known moves (no move needs to be forgotten). Same dialog
// shell/style as EvolutionItemConfirmDialog (no backdrop-click-to-dismiss,
// no ✕ close button — only its own two buttons ever close it): the player
// must explicitly confirm here too.
export function TmUseConfirmDialog({
  species,
  nickname,
  moveName,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: TmUseConfirmDialogProps) {
  const pokemonName = nickname ?? species.name;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="flex items-center justify-center">
          <SpriteImage
            src={getFrontSpritePath(species)}
            alt={species.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">{tmUseConfirmMessage(pokemonName, moveName)}</p>

        {errorMessage ? <p className="mt-3 text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tmUseCancelButtonLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tmUseConfirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
