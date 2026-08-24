"use client";

import { useState } from "react";

import { PendingEvolutionGate } from "@/features/evolution/components/PendingEvolutionGate";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { PendingMoveLearningGate } from "@/features/move-learning/components/PendingMoveLearningGate";
import type { PendingMoveLearningPromptView } from "@/features/move-learning/move-learning-view.service";

interface LevelUpDecisionsGateProps {
  initialPendingEvolution: PendingEvolutionView | null;
  initialPendingEvolutionBranch: PendingEvolutionBranchView | null;
  initialPendingMoveLearning: PendingMoveLearningPromptView | null;
}

// MOVE LEARNING UX — EVOLUTION MUST COME FIRST. The single mount point
// (Home, replacing the old direct <PendingEvolutionGate> usage) that
// orders the two existing "safety net" decision gates so they are NEVER
// shown at the same time, and evolution always resolves before move
// learning — even though the two gates otherwise know nothing about each
// other (PendingEvolutionGate has no idea PendingMoveLearningGate exists;
// it only reports "I'm fully resolved" via the optional onFullyResolved
// callback this component passes in).
//
// `evolutionResolved` starts true exactly when there was never a pending
// evolution/branch to begin with (the common case — most Home visits have
// neither), so PendingMoveLearningGate mounts immediately in that case;
// otherwise it flips true the moment PendingEvolutionGate reports it has
// nothing left to show (after an accept/reject/branch-choice leaves both
// its own states null). Reusing each gate's own existing fetch/mutate/
// resolve logic unchanged — this component only ever sequences them.
export function LevelUpDecisionsGate({
  initialPendingEvolution,
  initialPendingEvolutionBranch,
  initialPendingMoveLearning,
}: LevelUpDecisionsGateProps) {
  const [evolutionResolved, setEvolutionResolved] = useState(!initialPendingEvolution && !initialPendingEvolutionBranch);

  return (
    <>
      <PendingEvolutionGate
        initialPending={initialPendingEvolution}
        initialPendingBranch={initialPendingEvolutionBranch}
        onFullyResolved={() => setEvolutionResolved(true)}
      />
      {evolutionResolved ? <PendingMoveLearningGate initialView={initialPendingMoveLearning} /> : null}
    </>
  );
}
