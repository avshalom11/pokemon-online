import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { MarketplaceContent } from "@/features/marketplace/components/MarketplaceContent";
import { getEligibleMarketplaceItems, getEligibleMarketplacePokemon } from "@/features/marketplace/services/eligible-assets-view.service";
import { isMarketplaceUnlockedForPlayer } from "@/features/marketplace/services/marketplace-access.service";
import { getActiveMarketplaceListings, getOwnEditingListings } from "@/features/marketplace/services/marketplace-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// MARKETPLACE PHASE 3 — the browse + create-listing entry point. Real,
// server-side session check (the (game) route group's own layout guard
// already covers this route too — same belt-and-suspenders posture every
// other page under app/(game) takes, e.g. app/(game)/profile/[username]/page.tsx).
//
// Fetches everything the client needs up front in one request: every
// active listing (for anyone to browse) plus THIS viewer's own eligible
// Pokémon/items (for the "צור מכירה" flow) — never a separate client-side
// fetch for either. After a successful listing creation,
// MarketplaceContent calls router.refresh(), which re-runs this exact
// server fetch and flows fresh listings/eligibility back down as new
// props — never a manual client-side cache patch that could drift from
// the real server state.
export default async function MarketplacePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);

  // PLAYER LEVEL ACCESS REQUIREMENTS — checked before any listing/
  // eligibility data is fetched at all: a below-level viewer never receives
  // real Marketplace data in this page's own server-rendered payload, not
  // just a client-side hidden view of it. The mutating services below stay
  // authoritative regardless (defense in depth, same "server is the real
  // gate" posture as Gyms), but this is what makes "viewing" itself
  // actually gated server-side rather than merely covered by a UI overlay.
  const marketplaceUnlocked = await isMarketplaceUnlockedForPlayer(profile.id);

  if (!marketplaceUnlocked) {
    return (
      <GameScreen>
        <MarketplaceContent
          marketplaceUnlocked={false}
          listings={[]}
          eligiblePokemon={[]}
          eligibleItems={[]}
          viewerPlayerId={profile.id}
          ownEditingListings={[]}
        />
      </GameScreen>
    );
  }

  const [listings, eligiblePokemon, eligibleItems, ownEditingListings] = await Promise.all([
    getActiveMarketplaceListings(),
    getEligibleMarketplacePokemon(profile.id),
    getEligibleMarketplaceItems(profile.id),
    // MARKETPLACE PHASE 7 (hardening) — "editing recovery": see
    // getOwnEditingListings' own doc comment.
    getOwnEditingListings(profile.id),
  ]);

  return (
    <GameScreen>
      <MarketplaceContent
        marketplaceUnlocked={true}
        listings={listings}
        eligiblePokemon={eligiblePokemon}
        eligibleItems={eligibleItems}
        viewerPlayerId={profile.id}
        ownEditingListings={ownEditingListings}
      />
    </GameScreen>
  );
}
