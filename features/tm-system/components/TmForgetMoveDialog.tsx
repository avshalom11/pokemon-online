import {
  tmUseCancelButtonLabel,
  tmUseConfirmButtonLabel,
  tmUseForgetMovePrompt,
  tmUseForgetMovePromptMessage,
  tmUseForgetMovePromptTitle,
  tmUseNewMoveLabel,
} from "@/features/tm-system/messages/tm-use-messages";
import type { TmUseKnownMoveSlot } from "@/features/tm-system/services/tm-use-eligibility.service";

interface MoveStatsRowProps {
  type?: string;
  category?: string;
  power: number | null;
  accuracy: number | null;
}

// Same "type · category · power · accuracy" line MoveLearningDecisionDialog
// already established for the level-up learn-or-decline prompt — never a
// second/duplicated formatting convention for how a move's stats are
// printed.
function MoveStatsLine({ type, category, power, accuracy }: MoveStatsRowProps) {
  return (
    <span className="text-[11px] text-slate-400">
      {type ?? "—"} · {category ?? "—"} · כוח {power ?? "—"} · דיוק {accuracy ?? "—"}
    </span>
  );
}

interface TmForgetMoveDialogProps {
  pokemonName: string;
  moveName: string;
  moveType?: string;
  moveCategory?: string;
  movePower: number | null;
  moveAccuracy: number | null;
  knownMoves: TmUseKnownMoveSlot[];
  selectedSlot: number | null;
  onSelectSlot: (slot: number) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// The "replace" confirmation — shown only when the chosen Pokémon already
// knows 4 moves (REQUIREMENT 6: choose exactly one move to forget before
// confirming). Structurally mirrors MoveLearningDecisionDialog's own
// radio-group-of-4-known-moves pattern (a new component, not a literal
// reuse, since the underlying data shape differs — a TM teach has no
// PendingMoveLearning row — but the visual/interaction pattern is
// identical on purpose). Same "no backdrop-click-to-dismiss, no ✕ close
// button, Confirm disabled until a slot is chosen" rules as every other
// blocking decision dialog in this codebase.
export function TmForgetMoveDialog({
  pokemonName,
  moveName,
  moveType,
  moveCategory,
  movePower,
  moveAccuracy,
  knownMoves,
  selectedSlot,
  onSelectSlot,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: TmForgetMoveDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{tmUseForgetMovePromptTitle(pokemonName)}</h2>

        <p className="mt-4 text-sm text-slate-300">{tmUseForgetMovePromptMessage(pokemonName, moveName)}</p>

        <div className="mt-4 rounded-lg border border-indigo-400/30 bg-indigo-950/30 p-3 text-right">
          <p className="text-xs font-semibold text-indigo-300">{tmUseNewMoveLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{moveName}</p>
          <MoveStatsLine type={moveType} category={moveCategory} power={movePower} accuracy={moveAccuracy} />
        </div>

        <p className="mt-4 text-right text-xs text-slate-400">{tmUseForgetMovePrompt}</p>
        <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={tmUseForgetMovePrompt}>
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
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tmUseCancelButtonLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || selectedSlot === null}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tmUseConfirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
