import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface ReleaseConfirmDialogProps {
  pokemon: OwnedPokemon;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Stacked above PokemonDetailsPanel (z-[60] vs. its z-50) — same centered
// fixed-overlay idiom as ConfirmStarterDialog, scoped down to just the
// destructive confirmation this one action needs. Release is irreversible
// (a hard delete — see release-pokemon.service.ts), so this is the one
// required speed bump between clicking "שחרור פוקימון" and it actually
// happening; the destructive button is visually distinct (rose, not the
// neutral slate every other action button in this feature uses).
export function ReleaseConfirmDialog({ pokemon, pending, onCancel, onConfirm }: ReleaseConfirmDialogProps) {
  const displayName = pokemon.nickname ?? pokemon.species.name;

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
        className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <SpriteImage
          src={getFrontSpritePath(pokemon.species.dexNumber)}
          alt={displayName}
          className="mx-auto h-24 w-24 object-contain"
          fallbackClassName="mx-auto flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />

        <h2 className="mt-3 text-lg font-bold text-slate-100">{displayName}</h2>
        <p className="text-xs text-slate-500">רמה {pokemon.level}</p>

        <p className="mt-4 text-sm leading-relaxed text-slate-200">
          {`האם אתה בטוח שברצונך לשחרר את ${displayName}?`}
          <br />
          <span className="font-semibold text-rose-400">לא ניתן לבטל פעולה זו.</span>
        </p>

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
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "משחרר..." : "שחרר פוקימון"}
          </button>
        </div>
      </div>
    </div>
  );
}
