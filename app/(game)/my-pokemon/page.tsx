import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { MyPokemonContent } from "@/features/pokemon/components/MyPokemonContent";
import { getMyPokemonViewData } from "@/features/pokemon/services/my-pokemon-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip.
export default async function MyPokemonPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const data = await getMyPokemonViewData(session.user.id);

  return (
    <GameScreen>
      <MyPokemonContent data={data} />
    </GameScreen>
  );
}
