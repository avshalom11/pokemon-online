import { redirect } from "next/navigation";

import { BattleContent } from "@/features/battle/components/BattleContent";
import { getBattleViewData } from "@/features/battle/services/battle-view.service";
import { getInventoryView } from "@/features/inventory/services/inventory-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { ZoneId } from "@/shared/types/zone";

// The Bag only ever shows Poké Balls + Medicine (Stones have no in-battle
// use) — see BattleContent's own doc comment on why Stones is excluded
// rather than the Bag panel silently filtering a third tab no one asked for.
const BAG_CATEGORY_IDS = new Set(["poke-balls", "potions"]);

const VALID_ZONE_IDS: ZoneId[] = ["grassland", "water", "cave", "lava", "beach", "haunted-house"];

function isValidZoneId(value: string | undefined): value is ZoneId {
  return VALID_ZONE_IDS.includes(value as ZoneId);
}

// The generic auth + onboarding guard lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. Everything below is battle-specific: the
// wild encounter and the player's active Pokémon are resolved here
// (getBattleViewData) rather than client-side, so BattleContent receives a
// clean, already-validated view model — see
// features/battle/services/battle-view.service.ts.
export default async function BattlePage({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const { zone } = await searchParams;

  if (!isValidZoneId(zone)) {
    redirect("/map");
  }

  const result = await getBattleViewData(session.user.id, zone);

  // The player already has an active battle session, but for a different
  // zone than requested — never silently abandon or duplicate it; send
  // them back to their real, in-progress battle instead.
  if (result.status === "redirect") {
    redirect(`/battle?zone=${result.zoneId}`);
  }

  // No usable (HP > 0) party member — a battle must never start with a
  // fully-fainted party. Unreachable for a brand-new player (a starter is
  // guaranteed by onboarding) but reachable once fainted Pokémon exist.
  if (result.status === "no-usable-party") {
    redirect("/map?notice=party-needs-healing");
  }

  const { data } = result;

  // Resolved once here (not inside getBattleViewData) so the well-tested
  // battle-view assembler stays untouched — the Bag is purely additive.
  // getPlayerProfile is cache()-wrapped, so this costs no extra DB round
  // trip beyond what getBattleViewData already triggered.
  const profile = await getPlayerProfile(session.user.id);
  const inventoryView = await getInventoryView(profile.id);
  const bagItems = inventoryView.filter((view) => BAG_CATEGORY_IDS.has(view.item.categoryId));

  return (
    <BattleContent
      zoneId={zone}
      wild={data.wild}
      party={data.party}
      activePokemonId={data.activePokemonId}
      knownMovesByPokemonId={data.knownMovesByPokemonId}
      playerName={data.playerName}
      zonePreloadSpriteUrls={data.zonePreloadSpriteUrls}
      bagItems={bagItems}
    />
  );
}
