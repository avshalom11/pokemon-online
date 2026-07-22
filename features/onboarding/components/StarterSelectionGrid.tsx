"use client";

import { useActionState, useState } from "react";

import { ConfirmStarterDialog } from "./ConfirmStarterDialog";
import { StarterCard } from "./StarterCard";
import { selectStarterAction } from "@/features/onboarding/actions/select-starter.action";
import { initialSelectStarterActionState } from "@/features/onboarding/actions/onboarding-action-state";
import type { PokemonSpecies } from "@/shared/types/pokemon";

interface StarterSelectionGridProps {
  starters: PokemonSpecies[];
}

export function StarterSelectionGrid({ starters }: StarterSelectionGridProps) {
  const [state, formAction, pending] = useActionState(selectStarterAction, initialSelectStarterActionState);
  const [pendingSpecies, setPendingSpecies] = useState<PokemonSpecies | null>(null);

  return (
    <div dir="rtl" className="flex flex-col items-center gap-6">
      {state.status === "error" && state.message ? <p className="text-sm text-red-400">{state.message}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {starters.map((species) => (
          <StarterCard
            key={species.id}
            species={species}
            isSelected={pendingSpecies?.id === species.id}
            onSelect={() => setPendingSpecies(species)}
          />
        ))}
      </div>

      {pendingSpecies ? (
        <form action={formAction}>
          <input type="hidden" name="speciesId" value={pendingSpecies.id} />
          <ConfirmStarterDialog
            speciesName={pendingSpecies.name}
            pending={pending}
            onCancel={() => setPendingSpecies(null)}
          />
        </form>
      ) : null}
    </div>
  );
}
