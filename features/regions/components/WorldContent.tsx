"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { RegionCard } from "./RegionCard";
import { TravelConfirmDialog } from "./TravelConfirmDialog";
import { BackButton } from "@/components/layout/BackButton";
import { selectRegionAction } from "@/features/regions/actions/select-region.action";
import type { RegionId } from "@/shared/types/region";

export interface WorldRegionView {
  id: RegionId;
  hebrewName: string;
  travelCost: number;
  cardImageSrc: string;
}

interface WorldContentProps {
  regions: WorldRegionView[];
  activeRegionId: RegionId;
}

// The World page's body — lets the player pick their active region out of
// every RegionDefinition in the Region Registry (all available from the
// start; there is no locked-region state in this phase). Clicking a
// DIFFERENT region only ever opens TravelConfirmDialog first (REGION
// TRAVEL COST — section 5): the actual selectRegionAction call, and
// therefore the Money charge, only ever happens from that dialog's own
// "עבור למחוז" button, never from the card click itself. Optimistically
// shows the newly-picked card as active the instant the server action
// resolves successfully, then calls router.refresh() so the rest of the
// current route (crucially the global header in app/(game)/layout.tsx,
// which reads the player's region AND coins on every server render) picks
// up the change too — same pattern ProfileContent.tsx already uses after
// its own profile-editing action.
export function WorldContent({ regions, activeRegionId }: WorldContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRegionId, setSelectedRegionId] = useState(activeRegionId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingTravelRegionId, setPendingTravelRegionId] = useState<RegionId | null>(null);

  function handleCardClick(regionId: RegionId) {
    if (regionId === selectedRegionId || isPending) return;
    setErrorMessage(null);
    setPendingTravelRegionId(regionId);
  }

  function handleConfirmTravel() {
    const regionId = pendingTravelRegionId;
    if (!regionId || isPending) return;

    startTransition(async () => {
      const result = await selectRegionAction(regionId);

      if (result.status === "success") {
        setSelectedRegionId(result.regionId);
        setPendingTravelRegionId(null);
        router.refresh();
      } else {
        setPendingTravelRegionId(null);
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div>
          <h1 className="text-lg font-bold text-slate-100">מחוזות</h1>
          <p className="mt-1 text-sm text-slate-400">בחר את האזור הפעיל שלך</p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {regions.map((region) => (
            <RegionCard
              key={region.id}
              hebrewName={region.hebrewName}
              travelCost={region.travelCost}
              cardImageSrc={region.cardImageSrc}
              isActive={region.id === selectedRegionId}
              isPending={isPending}
              onSelect={() => handleCardClick(region.id)}
            />
          ))}
        </div>
      </div>

      {pendingTravelRegionId ? (
        <TravelConfirmDialog
          regionId={pendingTravelRegionId}
          isPending={isPending}
          onCancel={() => setPendingTravelRegionId(null)}
          onConfirm={handleConfirmTravel}
        />
      ) : null}
    </div>
  );
}
