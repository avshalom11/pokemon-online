import { redirect } from "next/navigation";

import { GymBattleContent } from "@/features/gyms/components/GymBattleContent";
import { getGymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// GYMS & LEAGUES PHASE 4 — the NPC battle screen (section 10). Requires an
// already-started NpcBattleSession (via /gyms's own "התחל קרב" button,
// which calls startGymBattleAction first) — a direct visit with no active
// session simply bounces back to /gyms, the same "no session, no battle
// screen" rule app/(game)/battle/page.tsx already enforces for Field
// Battle.
export default async function GymBattlePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const result = await getGymBattleViewData(profile.id, profile.displayName);

  if (result.status !== "ready") {
    redirect("/gyms");
  }

  return <GymBattleContent initialData={result.data} />;
}
