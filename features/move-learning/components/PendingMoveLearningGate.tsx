"use client";

import { useEffect, useState, useTransition } from "react";

import { MoveLearningDecisionDialog } from "@/features/move-learning/components/MoveLearningDecisionDialog";
import {
  declinePendingMoveAction,
  getFirstPendingMoveLearningViewAction,
  resolvePendingMoveLearnAction,
} from "@/features/move-learning/actions/move-learning.actions";
import { moveLearningErrorMessage } from "@/features/move-learning/messages/move-learning-messages";
import type { PendingMoveLearningPromptView } from "@/features/move-learning/move-learning-view.service";

interface PendingMoveLearningGateProps {
  // Server-fetched once, on Home's own page load (getHomeViewData ->
  // getFirstPendingMoveLearningView) — the account-wide safety net that
  // makes a "Known Moves already full" pending decision surface as soon as
  // the player is back on Home, regardless of whether it came from a Field
  // Battle victory or a Daycare pickup (both feed the exact same
  // PlayerPendingMoveLearning rows via applyLevelUpMoveLearning — see
  // pokemon-progression-service.ts's applyPokemonXpGrant, the one caller).
  // Same "seed from the server, safety net for whatever wasn't resolved
  // yet" role features/evolution/components/PendingEvolutionGate.tsx
  // already establishes for evolution — LevelUpDecisionsGate is what makes
  // sure this one never mounts before that one is fully resolved.
  initialView: PendingMoveLearningPromptView | null;
  // FIELD BATTLE MOVE LEARNING — optional, purely additive: fired whenever
  // this gate has no outstanding decision to show (`view` resolves to
  // null) — including immediately, on first render, if `initialView` was
  // already null. Same "report full resolution" contract features/
  // evolution/components/PendingEvolutionGate.tsx's own onFullyResolved
  // already establishes; BattleContent uses it to clear the local state
  // that seeded `initialView`, so a later, separate battle-victory grant
  // in the same still-mounted battle screen can seed and show a fresh one
  // instead of this callback-less version silently going stale. Omitted by
  // every other existing caller (Home's LevelUpDecisionsGate), which keeps
  // this component's prior behavior completely unchanged there.
  onFullyResolved?: () => void;
}

// MOVE LEARNING UX — mounted once at Home (via LevelUpDecisionsGate), same
// "provider/gate mounted once, driven by server-seeded initial state"
// pattern PendingEvolutionGate already establishes. Renders nothing when
// there is no pending decision.
//
// MULTIPLE PENDING MOVES: a multi-level XP jump can queue more than one
// pending decision (one per newly-eligible move that didn't fit). Rather
// than trusting router.refresh() to hand this component a fresh `initial`
// prop (React preserves this component's own state across a re-render, so
// a stale `initial` would never actually reach it — see
// PendingEvolutionGate's own limitation this deliberately avoids), every
// resolve/decline explicitly re-fetches the account's next pending
// decision via getFirstPendingMoveLearningViewAction and replaces local
// state with it — so "Move 1 popup -> resolve -> Move 2 popup -> resolve
// -> Move 3 popup" (this task's own required flow) keeps working
// regardless of how many are queued, one at a time, in the existing
// canonical (sequence-ascending) pending order.
export function PendingMoveLearningGate({ initialView, onFullyResolved }: PendingMoveLearningGateProps) {
  const [view, setView] = useState(initialView);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const pending = view?.nextPending ?? null;

  useEffect(() => {
    if (!pending) {
      onFullyResolved?.();
    }
    // Deliberately omits onFullyResolved from deps — same reasoning as
    // PendingEvolutionGate's own identical effect: this must only ever
    // re-fire on an actual pending transition, never on a parent rerender
    // that happens to pass a new function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (!pending) return null;

  async function advanceToNextPending() {
    const result = await getFirstPendingMoveLearningViewAction();
    setView(result.status === "ok" ? result.view : null);
    setSelectedSlot(null);
  }

  function handleLearn() {
    if (selectedSlot === null || !pending) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await resolvePendingMoveLearnAction(pending.id, selectedSlot);
      if (result.status !== "success") {
        setErrorMessage(moveLearningErrorMessage("למד", result.status));
        return;
      }
      await advanceToNextPending();
    });
  }

  function handleDecline() {
    if (!pending) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await declinePendingMoveAction(pending.id);
      if (result.status !== "success") {
        setErrorMessage(moveLearningErrorMessage("דחה", result.status));
        return;
      }
      await advanceToNextPending();
    });
  }

  return (
    <MoveLearningDecisionDialog
      pokemonName={view?.pokemonName ?? ""}
      pending={pending}
      knownMoves={view?.knownMoves ?? []}
      selectedSlot={selectedSlot}
      onSelectSlot={setSelectedSlot}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onLearn={handleLearn}
      onDecline={handleDecline}
    />
  );
}
