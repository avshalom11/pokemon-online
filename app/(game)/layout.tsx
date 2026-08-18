import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { GameHeader } from "@/components/layout/GameHeader";
import { GameSidebar } from "@/components/layout/GameSidebar";
import { ActiveBattleProvider } from "@/features/battle-session/context/active-battle-context";
import { hasActiveBattleSession } from "@/features/battle-session/services/battle-session.service";
import { hasActiveNpcBattleSession } from "@/features/gyms/services/gym-battle-session.service";
import { hasActiveLeagueBattleSession } from "@/features/leagues/services/league-battle-session.service";
import { getNotificationBellData } from "@/features/notifications/services/notification-service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { DailyBattleCountProvider } from "@/features/player/context/daily-battle-count-context";
import { PlayerProgressionProvider } from "@/features/player/context/player-progression-context";
import { getPlayerHeaderData } from "@/features/player/services/player-header-data.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The shared shell for every authenticated game page (Home, Map, Battle, My
// Pokémon, Pokémon Center — everything under this (game) route group; route
// groups don't affect the URL, so /home is still /home). Owns the one
// real, server-side auth + onboarding guard these pages used to each repeat
// individually, and renders the global header exactly once.
//
// getCurrentSession/getPlayerProfile (via getPlayerHeaderData) are both
// cache()-wrapped, so this running before each page's own data-fetching
// costs zero extra DB round trips within the same request.
//
// Battle keeps its own additional logic (zone validation, active-session
// redirect, no-usable-party redirect) in app/(game)/battle/page.tsx — only
// the generic "is there a session, has onboarding finished" check lives
// here, since every one of these pages needs exactly that and nothing more.
export default async function GameLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  // getPlayerProfile is cache()-wrapped (lib/auth/player-profile.ts), so
  // this and getPlayerHeaderData's own internal call below collapse into
  // one DB round trip — needed here only to get the PlayerProfile id
  // getNotificationBellData is scoped by.
  const profile = await getPlayerProfile(session.user.id);
  const [player, notifications, hasFieldBattle, hasNpcBattle, hasLeagueBattle] = await Promise.all([
    getPlayerHeaderData(session.user.id, session.user.username ?? null),
    getNotificationBellData(profile.id),
    hasActiveBattleSession(profile.id),
    // GYMS & LEAGUES PHASE 4 — a hard refresh mid-Gym-battle must lock
    // navigation exactly like a hard refresh mid-Field-Battle already does;
    // GymBattleContent's own mount/unmount keeps this correct for
    // client-side navigation the rest of the time (same split
    // ActiveBattleProvider's own doc comment already documents for Field
    // Battle).
    hasActiveNpcBattleSession(profile.id),
    // GYMS & LEAGUES PHASE 6 — same reasoning, for a hard refresh mid-
    // League-PvP-match; LeagueMatchContent's own mount/unmount keeps this
    // correct for client-side navigation otherwise.
    hasActiveLeagueBattleSession(profile.id),
  ]);
  const activeBattle = hasFieldBattle || hasNpcBattle || hasLeagueBattle;

  return (
    <PlayerProgressionProvider initial={player.progress}>
      <DailyBattleCountProvider initial={player.dailyBattleCount}>
        <ActiveBattleProvider initial={activeBattle}>
          <GameHeader player={player} notifications={notifications} />
          <GameSidebar username={player.username} />
          {children}
        </ActiveBattleProvider>
      </DailyBattleCountProvider>
    </PlayerProgressionProvider>
  );
}
