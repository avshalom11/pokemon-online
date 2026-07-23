import { redirect } from "next/navigation";

import { GameHeader } from "@/components/layout/GameHeader";
import { BattleContent } from "@/features/battle/components/BattleContent";
import { getBattleViewData } from "@/features/battle/services/battle-view.service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";
import type { ZoneId } from "@/shared/types/zone";

const VALID_ZONE_IDS: ZoneId[] = ["grassland", "water", "cave", "lava", "beach", "haunted-house"];

function isValidZoneId(value: string | undefined): value is ZoneId {
  return VALID_ZONE_IDS.includes(value as ZoneId);
}

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard), same pattern as
// app/map/page.tsx. The wild encounter and the player's active Pokémon are
// both resolved here (getBattleViewData) rather than client-side, so
// BattleContent receives a clean, already-validated view model — see
// features/battle/services/battle-view.service.ts.
export default async function BattlePage({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  const { zone } = await searchParams;

  if (!isValidZoneId(zone)) {
    redirect("/map");
  }

  const data = await getBattleViewData(session.user.id, zone);

  // No usable (HP > 0) party member — a battle must never start with a
  // fully-fainted party. Unreachable for a brand-new player (a starter is
  // guaranteed by onboarding) but reachable once fainted Pokémon exist.
  if (!data) {
    redirect("/map?notice=party-needs-healing");
  }

  return (
    <>
      <GameHeader />
      <BattleContent zoneId={zone} wild={data.wild} party={data.party} activePokemonId={data.activePokemonId} />
    </>
  );
}
