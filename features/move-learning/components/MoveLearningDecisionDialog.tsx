import {
  moveLearningDeclineButtonLabel,
  moveLearningLearnButtonLabel,
  moveLearningNewMoveLabel,
  moveLearningPromptMessage,
  moveLearningPromptTitle,
  moveLearningReplaceMovePrompt,
} from "@/features/move-learning/messages/move-learning-messages";
import type { PendingMoveLearningViewPending, PendingMoveLearningViewSlot } from "@/features/move-learning/move-learning-view.service";

interface MoveStatsRowProps {
  type?: string;
  category?: string;
  power: number | null;
  accuracy: number | null;
}

// MOVE COMPARISON — one line of "type · category · power · accuracy",
// reusing the EXACT same fields/formatting components/battle/
// BattleAttackPanel.tsx already established for the in-battle attack
// panel (`{attack.power ?? "—"}` / `{attack.accuracy ?? "—"}`) — never a
// second/duplicated convention for "how do we print a move's stats" or a
// hardcoded damage/accuracy value. power/accuracy are read straight off
// the Move Registry server-side (move-learning-view.service.ts); this
// component only ever formats what it's given.
function MoveStatsLine({ type, category, power, accuracy }: MoveStatsRowProps) {
  return (
    <span className="text-[11px] text-slate-400">
      {type ?? "—"} · {category ?? "—"} · כוח {power ?? "—"} · דיוק {accuracy ?? "—"}
    </span>
  );
}

interface MoveLearningDecisionDialogProps {
  pokemonName: string;
  pending: PendingMoveLearningViewPending;
  knownMoves: PendingMoveLearningViewSlot[];
  selectedSlot: number | null;
  onSelectSlot: (slot: number) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onLearn: () => void;
  onDecline: () => void;
}

// MOVE LEARNING UX — the blocking "learn or decline a new move" decision
// modal, shown the moment a pending move-learning decision exists (Known
// Moves were already full when the move became eligible — fewer than four
// known moves keeps the pre-existing silent auto-learn behavior; this
// dialog only ever exists for the "already full" case). Purely
// presentational, same split as EvolutionPromptDialog: takes an
// already-resolved view + callbacks, never fetches or mutates anything
// itself — PendingMoveLearningGate (site orchestration) and
// PendingMoveLearningPanel (the pre-existing My Pokémon on-demand surface)
// can both drive it without a second implementation of this markup.
//
// Deliberately no backdrop-click-to-dismiss and no ✕ close button — same
// "the player must explicitly choose one of the two buttons" rule
// EvolutionPromptDialog already establishes, and this task's own "do not
// auto-replace a move" / "do not enable Learn until a slot is selected"
// requirement.
export function MoveLearningDecisionDialog({
  pokemonName,
  pending,
  knownMoves,
  selectedSlot,
  onSelectSlot,
  isSubmitting,
  errorMessage,
  onLearn,
  onDecline,
}: MoveLearningDecisionDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{moveLearningPromptTitle(pokemonName)}</h2>

        <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{moveLearningPromptMessage(pokemonName, pending.moveName)}</p>

        <div className="mt-4 rounded-lg border border-indigo-400/30 bg-indigo-950/30 p-3 text-right">
          <p className="text-xs font-semibold text-indigo-300">{moveLearningNewMoveLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{pending.moveName}</p>
          <MoveStatsLine type={pending.type} category={pending.category} power={pending.power} accuracy={pending.accuracy} />
        </div>

        <p className="mt-4 text-right text-xs text-slate-400">{moveLearningReplaceMovePrompt}</p>
        <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={moveLearningReplaceMovePrompt}>
          {knownMoves.map((move) => (
            <button
              key={move.slot}
              type="button"
              role="radio"
              aria-checked={selectedSlot === move.slot}
              onClick={() => onSelectSlot(move.slot)}
              disabled={isSubmitting}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedSlot === move.slot
                  ? "border-indigo-400 bg-indigo-500/20"
                  : "border-white/10 bg-slate-800/70 hover:border-white/20"
              }`}
            >
              <span className="text-sm font-semibold text-slate-100">{move.moveName}</span>
              <MoveStatsLine type={move.type} category={move.category} power={move.power} accuracy={move.accuracy} />
            </button>
          ))}
        </div>

        {errorMessage ? <p className="mt-3 text-[11px] text-rose-400">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onDecline}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {moveLearningDeclineButtonLabel}
          </button>
          <button
            type="button"
            onClick={onLearn}
            disabled={isSubmitting || selectedSlot === null}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {moveLearningLearnButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
