import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { PokedexContent } from "@/features/pokedex/components/PokedexContent";
import { getPokedexView } from "@/features/pokedex/services/pokedex-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The real auth + onboarding guard lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip.
export default async function PokedexPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const entries = await getPokedexView(profile.id);

  return (
    <GameScreen>
      <PokedexContent entries={entries} />
    </GameScreen>
  );
}
