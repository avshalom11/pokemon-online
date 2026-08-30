"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { RegionCard } from "./RegionCard";
import { TravelConfirmDialog } from "./TravelConfirmDialog";
import { BackButton } from "@/components/layout/BackButton";
import { selectRegionAction, selectRegionFreeAction } from "@/features/regions/actions/select-region.action";
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
  // FREE FLY/SURF TRAVEL — a page-load-time read (app/(game)/world/page.tsx,
  // via hasFreeTravelEligibility), purely to decide whether the dialog even
  // OFFERS the free button. Never trusted as proof of eligibility by
  // itself: selectRegionFreeAction re-checks it server-side at submit time
  // regardless of what this flag says, so a stale true (party changed after
  // page load) can only ever show a button that then errors, never grant a
  // free trip.
  canTravelFree: boolean;
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
export function WorldContent({ regions, activeRegionId, canTravelFree }: WorldContentProps) {
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

  // FREE FLY/SURF TRAVEL — same shape as handleConfirmTravel above, the
  // only difference is which Server Action it calls. Only ever reachable
  // from the dialog's own free-travel button, which itself only renders
  // when canTravelFree is true — but selectRegionFreeAction re-checks
  // eligibility server-side regardless, so this is never the only guard.
  function handleConfirmFreeTravel() {
    const regionId = pendingTravelRegionId;
    if (!regionId || isPending) return;

    startTransition(async () => {
      const result = await selectRegionFreeAction(regionId);

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

        {/* FREE FLY/SURF TRAVEL — a permanent tip, always shown regardless
            of canTravelFree: the whole point is to tell a player who does
            NOT currently qualify that the option exists, not just confirm
            it to players who already know. Never gated on that prop. Same
            small-tip visual convention ShopItemGrid's own categoryTip
            banner already establishes (rounded-xl border/bg-tint/p-3/
            text-xs), themed emerald here to echo the free-travel button's
            own color in TravelConfirmDialog rather than this page's
            existing indigo/slate palette used for neutral chrome. */}
        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-200"
        >
          <span aria-hidden="true" className="text-sm leading-none">
            💡
          </span>
          <p>
            <span className="font-semibold text-emerald-100">טיפ למאמן:</span> פוקימון בשישייה שלך שיודע{" "}
            <span className="font-semibold text-emerald-100">Fly</span> או{" "}
            <span className="font-semibold text-emerald-100">Surf</span> יכול לעזור לך לעבור בין מחוזות בחינם, ללא
            תשלום על הנסיעה.
          </p>
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
          canTravelFree={canTravelFree}
          onCancel={() => setPendingTravelRegionId(null)}
          onConfirm={handleConfirmTravel}
          onConfirmFree={handleConfirmFreeTravel}
        />
      ) : null}
    </div>
  );
}
