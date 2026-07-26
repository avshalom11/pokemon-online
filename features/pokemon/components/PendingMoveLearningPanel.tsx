"use client";

import { useEffect, useState, useTransition } from "react";

import {
  getPendingMoveLearningViewAction,
  resolvePendingMoveLearnAction,
  declinePendingMoveAction,
} from "@/features/move-learning/actions/move-learning.actions";
import type { PendingMoveLearningView } from "@/features/move-learning/move-learning-view.service";

interface PendingMoveLearningPanelProps {
  playerPokemonId: string;
}

// Minimal, functionality-first UI (Phase 4E) — no styling pass, just
// enough markup to exercise the whole learn/decline/replace flow. Renders
// nothing if this Pokémon currently has no unresolved Pending Move
// Learning decision. "Learn" always requires picking which existing Known
// Move slot to replace (RULES: learning a pending move never creates a
// fifth Known Move) — there is no "just add it" shortcut even when a slot
// would technically be free.
export function PendingMoveLearningPanel({ playerPokemonId }: PendingMoveLearningPanelProps) {
  const [view, setView] = useState<PendingMoveLearningView | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumped after every learn/decline to trigger a refetch — simpler than
  // memoizing `refresh` itself for this minimal (functionality-first, no
  // styling pass) panel.
  const [refreshCount, setRefreshCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getPendingMoveLearningViewAction(playerPokemonId);
      setView(result.status === "ok" ? result.view : null);
      setSelectedSlot(null);
    });
  }, [playerPokemonId, refreshCount, startTransition]);

  function refresh() {
    setRefreshCount((count) => count + 1);
  }

  const pending = view?.nextPending ?? null;
  if (!pending) return null;

  function handleLearn() {
    if (selectedSlot === null || !pending) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await resolvePendingMoveLearnAction(pending.id, selectedSlot);
      if (result.status !== "success") {
        setErrorMessage(`לא ניתן היה ללמד את המהלך (${result.status}).`);
        return;
      }
      refresh();
    });
  }

  function handleDecline() {
    if (!pending) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await declinePendingMoveAction(pending.id);
      if (result.status !== "success") {
        setErrorMessage(`לא ניתן היה לדחות את המהלך (${result.status}).`);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-indigo-400/30 bg-indigo-950/30 p-3">
      <h3 className="mb-2 text-xs font-semibold text-indigo-300">הזדמנות ללימוד מהלך</h3>
      <p className="mb-2 text-sm text-slate-200">
        {`הפוקימון רוצה ללמוד את ${pending.moveName} (הושג ברמה ${pending.learnedAtLevel})`}
      </p>

      <p className="mb-1 text-xs text-slate-400">בחר מהלך להחלפה:</p>
      <div className="mb-3 space-y-1">
        {view?.knownMoves.map((move) => (
          <label key={move.slot} className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="radio"
              name="pending-move-replace-slot"
              checked={selectedSlot === move.slot}
              onChange={() => setSelectedSlot(move.slot)}
            />
            {`משבצת ${move.slot}: ${move.moveName}`}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || selectedSlot === null}
          onClick={handleLearn}
          className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          למד (החלף מהלך נבחר)
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDecline}
          className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          דחה
        </button>
      </div>

      {errorMessage ? <p className="mt-2 text-[11px] text-rose-400">{errorMessage}</p> : null}
    </div>
  );
}
