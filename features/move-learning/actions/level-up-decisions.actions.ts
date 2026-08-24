"use server";

import { getFirstPendingEvolutionBranchView, getFirstPendingEvolutionView } from "@/features/evolution/queries/evolution-queries";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { getFirstPendingMoveLearningView } from "@/features/move-learning/move-learning-view.service";
import type { PendingMoveLearningPromptView } from "@/features/move-learning/move-learning-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export interface PendingLevelUpDecisions {
  pendingEvolution: PendingEvolutionView | null;
  pendingEvolutionBranch: PendingEvolutionBranchView | null;
  pendingMoveLearning: PendingMoveLearningPromptView | null;
}

// LEVEL-UP DECISIONS — SHARED CLIENT ENTRY POINT. The exact same
// account-wide bundle getHomeViewData already assembles server-side for
// Home's own first paint (pendingEvolution / pendingEvolutionBranch /
// pendingMoveLearning — three existing, unchanged queries:
// features/evolution/queries/evolution-queries.ts's
// getFirstPendingEvolutionView/getFirstPendingEvolutionBranchView, and
// features/move-learning/move-learning-view.service.ts's
// getFirstPendingMoveLearningView), now also callable on demand from the
// client. Never feature-specific and never Daycare-specific: this is for
// ANY client surface that can create a pending decision through its own
// Server Action call (rather than a full page navigation/server render)
// and needs to know immediately what's now pending, without waiting for
// the next page load. Today's one caller is Daycare pickup
// (DaycareContent, after a successful collectFromDaycareAction) — no new
// evolution/move-learning logic of any kind lives here, only a thin
// bundle of three pre-existing reads in one round trip.
export type PendingLevelUpDecisionsActionResult = { status: "ok"; decisions: PendingLevelUpDecisions } | { status: "error" };

export async function getPendingLevelUpDecisionsAction(): Promise<PendingLevelUpDecisionsActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const [pendingEvolution, pendingEvolutionBranch, pendingMoveLearning] = await Promise.all([
    getFirstPendingEvolutionView(profile.id),
    getFirstPendingEvolutionBranchView(profile.id),
    getFirstPendingMoveLearningView(profile.id),
  ]);

  return { status: "ok", decisions: { pendingEvolution, pendingEvolutionBranch, pendingMoveLearning } };
}
