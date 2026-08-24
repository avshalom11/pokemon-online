"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { EvolutionBranchChoiceDialog } from "./EvolutionBranchChoiceDialog";
import { EvolutionPromptDialog } from "./EvolutionPromptDialog";
import { acceptEvolutionAction, chooseEvolutionBranchAction, rejectEvolutionAction } from "@/features/evolution/actions/evolution.actions";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";

interface PendingEvolutionGateProps {
  // Server-fetched once, on Home's own page load (getHomeViewData ->
  // getFirstPendingEvolutionView) — the safety net for a decision the
  // in-battle prompt (BattleContent) already offered but the player left
  // unresolved (refresh, navigation, closing the tab mid-battle). Renders
  // nothing when both this and initialPendingBranch below are null; the
  // same PendingEvolutionView shape and the same EvolutionPromptDialog
  // either way, so the player sees an identical prompt regardless of which
  // surface raised it.
  initialPending: PendingEvolutionView | null;
  // Same safety net, for an unresolved Branch Evolution CHOICE instead
  // (Eevee's Espeon/Umbreon fork — see getFirstPendingEvolutionBranchView).
  // Mutually exclusive with initialPending for any one Pokémon, but this
  // component only ever shows one dialog at a time regardless — if the
  // server ever produced both (two different Pokémon), initialPending
  // takes priority, matching BattleContent's own "handle one decision at a
  // time" rule.
  initialPendingBranch: PendingEvolutionBranchView | null;
  // MOVE LEARNING UX — optional, purely additive: fired whenever this gate
  // has no outstanding decision to show (both `pending` and
  // `pendingBranch` are null) — including immediately, on first render, if
  // the player never had one to begin with. LevelUpDecisionsGate is the
  // one caller, using it to hold off mounting PendingMoveLearningGate
  // until evolution is completely out of the way (this task's own
  // "evolution must come first, never show both at once" rule). Omitted
  // by every other existing caller, which keeps this component's own
  // evolution-only behavior completely unchanged.
  onFullyResolved?: () => void;
}

export function PendingEvolutionGate({ initialPending, initialPendingBranch, onFullyResolved }: PendingEvolutionGateProps) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [pendingBranch, setPendingBranch] = useState(initialPending ? null : initialPendingBranch);
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    if (!pending && !pendingBranch) {
      onFullyResolved?.();
    }
    // Deliberately omits onFullyResolved from deps: it's expected to be an
    // inline callback from the one caller that uses it, and this must only
    // ever re-fire on an actual pending/pendingBranch transition, never on
    // a parent rerender that happens to pass a new function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, pendingBranch]);

  function handleAccept() {
    if (!pending) return;
    const targetId = pending.playerPokemonId;

    startTransition(async () => {
      const result = await acceptEvolutionAction(targetId);
      setPending(null);
      // A successful species/HP change already revalidates /home server-
      // side (see the action itself) — router.refresh() is what actually
      // pulls that fresh data into this already-mounted page without a
      // full navigation, same idiom RefreshHomeOnMount already uses.
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleReject() {
    if (!pending) return;
    const targetId = pending.playerPokemonId;

    startTransition(async () => {
      await rejectEvolutionAction(targetId);
      setPending(null);
    });
  }

  // Step one of the Branch Evolution flow (Eevee's Espeon/Umbreon fork) —
  // on success, swaps the branch-choice dialog for the normal
  // EvolutionPromptDialog (via `pending`) so the player still gives an
  // explicit final confirmation, exactly like any other level evolution —
  // this never evolves the Pokémon by itself.
  function handleChooseBranch(targetSpeciesId: string) {
    if (!pendingBranch) return;
    const { playerPokemonId, nickname, currentSpecies, targets } = pendingBranch;
    const chosenSpecies = targets.find((target) => target.id === targetSpeciesId);

    startTransition(async () => {
      const result = await chooseEvolutionBranchAction(playerPokemonId, targetSpeciesId);
      setPendingBranch(null);

      if (result.status === "success" && chosenSpecies) {
        setPending({ playerPokemonId, nickname, currentSpecies, evolvedSpecies: chosenSpecies });
      }
    });
  }

  // Rejecting a branch choice is permanent, exactly like rejecting a
  // normal level evolution (reject-evolution.service.ts handles both
  // pending states).
  function handleRejectBranch() {
    if (!pendingBranch) return;
    const targetId = pendingBranch.playerPokemonId;

    startTransition(async () => {
      await rejectEvolutionAction(targetId);
      setPendingBranch(null);
    });
  }

  if (pending) {
    return <EvolutionPromptDialog pending={pending} isSubmitting={isSubmitting} onAccept={handleAccept} onReject={handleReject} />;
  }

  if (pendingBranch) {
    return (
      <EvolutionBranchChoiceDialog pending={pendingBranch} isSubmitting={isSubmitting} onChoose={handleChooseBranch} onReject={handleRejectBranch} />
    );
  }

  return null;
}
