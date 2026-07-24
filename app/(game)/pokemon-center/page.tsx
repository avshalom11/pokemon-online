import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { PokemonCenterContent } from "@/features/pokemon-center/components/PokemonCenterContent";
import { getPokemonCenterViewData } from "@/features/pokemon-center/services/pokemon-center-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip.
export default async function PokemonCenterPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const data = await getPokemonCenterViewData(session.user.id);

  return (
    <GameScreen>
      <PokemonCenterContent initialParty={data.party} />
    </GameScreen>
  );
}
