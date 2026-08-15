import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HatcheryContent } from "@/features/hatchery/components/HatcheryContent";
import { getHatcheryViewData } from "@/features/hatchery/services/hatchery-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

// The generic auth + onboarding guard lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. getHatcheryViewData itself ensures the
// player's Standard Incubator exists (features/eggs/services/
// incubator.service.ts's ensureStandardIncubator) — no separate migration
// step for existing players.
export default async function HatcheryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/");

  const data = await getHatcheryViewData(session.user.id);

  return (
    <GameScreen>
      <HatcheryContent initialData={data} />
    </GameScreen>
  );
}
