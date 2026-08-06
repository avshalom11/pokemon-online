import { SpriteImage } from "@/components/media/SpriteImage";
import { evolutionBranchChoiceMessage, evolutionBranchChoiceTitle } from "@/features/evolution/messages/evolution-messages";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonSpecies } from "@/shared/types/pokemon";

interface EvolutionItemBranchChoiceDialogProps {
  currentSpecies: PokemonSpecies;
  nickname: string | null;
  targets: PokemonSpecies[];
  isSubmitting: boolean;
  onChoose: (target: PokemonSpecies) => void;
  onCancel: () => void;
}

// The Evolution-Item counterpart of EvolutionBranchChoiceDialog (level
// evolution's Eevee/Wurmple/Nincada choice) — same "grid of sprite buttons,
// player picks exactly one target" visual pattern, reused here for
// Clamperl's Water Stone branch (Huntail vs Gorebyss). Deliberately its own
// component rather than reusing EvolutionBranchChoiceDialog directly: that
// dialog is wired to the DB-backed pendingEvolutionBranch flow (a
// PERMANENT reject via chooseEvolutionBranch/rejectEvolution) which doesn't
// apply here — an evolution-item evolution is Inventory-initiated and
// cancelling it is never permanent, same "no reject-warning" rule
// EvolutionItemConfirmDialog already follows. Choosing a target here only
// moves the flow to EvolutionItemConfirmDialog for the final explicit
// confirm — it never calls the accept action itself.
export function EvolutionItemBranchChoiceDialog({
  currentSpecies,
  nickname,
  targets,
  isSubmitting,
  onChoose,
  onCancel,
}: EvolutionItemBranchChoiceDialogProps) {
  const currentName = nickname ?? currentSpecies.name;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{evolutionBranchChoiceTitle}</h2>

        <div className="mt-4 flex items-center justify-center">
          <SpriteImage
            src={getFrontSpritePath(currentSpecies)}
            alt={currentSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">{evolutionBranchChoiceMessage(currentName)}</p>

        <div className="mt-4 flex justify-center gap-4">
          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onChoose(target)}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SpriteImage
                src={getFrontSpritePath(target)}
                alt={target.name}
                className="h-16 w-16 object-contain"
                fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
              />
              <span className="text-xs font-semibold text-slate-100">{target.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
