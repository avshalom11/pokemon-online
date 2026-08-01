"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { EvolutionPromptDialog } from "./EvolutionPromptDialog";
import { acceptEvolutionAction, rejectEvolutionAction } from "@/features/evolution/actions/evolution.actions";
import type { PendingEvolutionView } from "@/features/evolution/types/evolution.types";

interface PendingEvolutionGateProps {
  // Server-fetched once, on Home's own page load (getHomeViewData ->
  // getFirstPendingEvolutionView) — the safety net for a decision the
  // in-battle prompt (BattleContent) already offered but the player left
  // unresolved (refresh, navigation, closing the tab mid-battle). Renders
  // nothing when null; the same PendingEvolutionView shape and the same
  // EvolutionPromptDialog either way, so the player sees an identical
  // prompt regardless of which surface raised it.
  initialPending: PendingEvolutionView | null;
}

export function PendingEvolutionGate({ initialPending }: PendingEvolutionGateProps) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [isSubmitting, startTransition] = useTransition();

  if (!pending) {
    return null;
  }

  // TypeScript's narrowing above doesn't propagate into the nested
  // function declarations below (a known control-flow-analysis limit for
  // closures over a `useState` value) — this plain, never-reassigned local
  // const is what lets handleAccept/handleReject reference a properly
  // non-null PendingEvolutionView without a redundant runtime check.
  const currentPending = pending;

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptEvolutionAction(currentPending.playerPokemonId);
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
    startTransition(async () => {
      await rejectEvolutionAction(currentPending.playerPokemonId);
      setPending(null);
    });
  }

  return <EvolutionPromptDialog pending={currentPending} isSubmitting={isSubmitting} onAccept={handleAccept} onReject={handleReject} />;
}
