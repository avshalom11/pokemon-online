import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { InventoryContent } from "@/features/inventory/components/InventoryContent";
import { getInventoryView, getOwnedChestViews, getOwnedEggViews, getOwnedIncubatorViews } from "@/features/inventory/services/inventory-view.service";
import { getAllOwnedPokemon } from "@/features/pokemon/services/player-pokemon";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. Deliberately its own route, reachable from
// Home's navigation grid — never rendered inside the Battle page.
export default async function InventoryPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const [views, ownedPokemon, eggs, incubators, chests] = await Promise.all([
    getInventoryView(profile.id),
    getAllOwnedPokemon(profile.id),
    getOwnedEggViews(profile.id),
    getOwnedIncubatorViews(profile.id),
    getOwnedChestViews(profile.id),
  ]);

  return (
    <GameScreen>
      <InventoryContent views={views} ownedPokemon={ownedPokemon} eggs={eggs} incubators={incubators} chests={chests} />
    </GameScreen>
  );
}
