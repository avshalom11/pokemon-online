import { SpriteImage } from "@/components/media/SpriteImage";
import { evolutionBranchChoiceMessage, evolutionBranchChoiceTitle, evolutionRejectWarning } from "@/features/evolution/messages/evolution-messages";
import type { PendingEvolutionBranchView } from "@/features/evolution/types/evolution.types";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";

interface EvolutionBranchChoiceDialogProps {
  pending: PendingEvolutionBranchView;
  isSubmitting: boolean;
  onChoose: (targetSpeciesId: string) => void;
  onReject: () => void;
}

// Step one of the two-step Branch Evolution flow (Eevee's Espeon/Umbreon
// fork today, extensible to any future BRANCH_EVOLUTIONS entry with more
// targets) — the player picks exactly one of `pending.targets` explicitly,
// never automatic/random/time-of-day. Choosing calls
// chooseEvolutionBranchAction; on success the caller (BattleContent /
// PendingEvolutionGate) swaps this dialog for the normal
// EvolutionPromptDialog to get the player's final explicit confirmation,
// reusing that existing flow exactly like any other level evolution — this
// dialog's own job is ONLY the choice itself.
//
// Same no-backdrop-dismiss / no ✕ close button rule as EvolutionPromptDialog
// — rejecting (declining to evolve into either form at all) is the only way
// out besides an explicit choice, and it's permanent, exactly like
// rejecting any other level evolution.
export function EvolutionBranchChoiceDialog({ pending, isSubmitting, onChoose, onReject }: EvolutionBranchChoiceDialogProps) {
  const currentName = pending.nickname ?? pending.currentSpecies.name;

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
            src={getFrontSpritePath(pending.currentSpecies.dexNumber)}
            alt={pending.currentSpecies.name}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">{evolutionBranchChoiceMessage(currentName)}</p>

        <div className="mt-4 flex justify-center gap-4">
          {pending.targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onChoose(target.id)}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SpriteImage
                src={getFrontSpritePath(target.dexNumber)}
                alt={target.name}
                className="h-16 w-16 object-contain"
                fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
              />
              <span className="text-xs font-semibold text-slate-100">{target.name}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs font-semibold text-rose-400">{evolutionRejectWarning}</p>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onReject}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            לא, הישאר כפי שאתה
          </button>
        </div>
      </div>
    </div>
  );
}
