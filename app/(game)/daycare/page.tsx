import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { DaycareContent } from "@/features/daycare/components/DaycareContent";
import { getDaycareViewData } from "@/features/daycare/services/daycare-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The generic auth + onboarding guard lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip.
export default async function DaycarePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/");

  const profile = await getPlayerProfile(session.user.id);
  const data = await getDaycareViewData(profile.id);

  return (
    <GameScreen>
      <DaycareContent initialData={data} />
    </GameScreen>
  );
}
