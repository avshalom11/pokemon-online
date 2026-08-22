import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { GameHeader } from "@/components/layout/GameHeader";
import { GameSidebar } from "@/components/layout/GameSidebar";
import { ActiveBattleProvider } from "@/features/battle-session/context/active-battle-context";
import { hasActiveBattleSession } from "@/features/battle-session/services/battle-session.service";
import { GlobalChatBar } from "@/features/chat/components/GlobalChatBar";
import { getRecentGlobalChatMessages } from "@/features/chat/services/global-chat.service";
import { FloatingPrivateChatWindow } from "@/features/friends/components/FloatingPrivateChatWindow";
import { FriendsBar } from "@/features/friends/components/FriendsBar";
import { FriendshipSyncWatcher } from "@/features/friends/components/FriendshipSyncWatcher";
import { PrivateMessagePopupWatcher } from "@/features/friends/components/PrivateMessagePopupWatcher";
import { SocialDock } from "@/features/friends/components/SocialDock";
import { FriendsDataProvider } from "@/features/friends/context/friends-data-context";
import { PrivateChatWindowProvider } from "@/features/friends/context/private-chat-window-context";
import { getFriendsAndRequests } from "@/features/friends/services/friendship.service";
import { hasActiveNpcBattleSession } from "@/features/gyms/services/gym-battle-session.service";
import { hasActiveLeagueBattleSession } from "@/features/leagues/services/league-battle-session.service";
import { getNotificationBellData } from "@/features/notifications/services/notification-service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { PresenceHeartbeat } from "@/features/presence/components/PresenceHeartbeat";
import { DailyBattleCountProvider } from "@/features/player/context/daily-battle-count-context";
import { PlayerProgressionProvider } from "@/features/player/context/player-progression-context";
import { SoundSettingsProvider } from "@/features/player/context/sound-settings-context";
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
  const [player, notifications, hasFieldBattle, hasNpcBattle, hasLeagueBattle, globalChatMessages, friendsData] = await Promise.all([
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
    // GLOBAL CHAT — seeds GlobalChatBar's first paint with the real latest
    // messages, exactly like every other panel here; the bar's own polling
    // (features/chat/actions/global-chat.actions.ts) keeps it live after
    // that without ever needing this layout to re-render.
    getRecentGlobalChatMessages(),
    // FRIENDS QUICK ACTIONS — seeds FriendsDataProvider's first paint with
    // the real current friends/incoming-requests, the one shared source
    // every friends-UI surface (the notification bell's own inline
    // accept/decline, the bottom-right Friends bar, Profile's own חברים
    // section, another player's public profile) reads from and mutates
    // through from here on — see friends-data-context.tsx's own doc
    // comment for why this replaces what used to be a separate fetch on
    // the profile page itself.
    getFriendsAndRequests(profile.id),
  ]);
  const activeBattle = hasFieldBattle || hasNpcBattle || hasLeagueBattle;

  return (
    <SoundSettingsProvider initial={profile.soundEnabled ?? true}>
      <PlayerProgressionProvider initial={player.progress}>
        <DailyBattleCountProvider initial={player.dailyBattleCount}>
          <ActiveBattleProvider initial={activeBattle}>
            {/* FRIENDS + PRIVATE CHAT UX — mounted once here (never inside
                {children}), so the floating chat window's own state
                (which conversation is active, minimized or expanded)
                survives every client-side navigation for the lifetime of
                this layout — same pattern ActiveBattleProvider itself
                already establishes. FriendsDataProvider wraps GameHeader
                too (not just {children}) since the notification bell's own
                inline accept/decline needs it as well. */}
            <FriendsDataProvider initial={friendsData}>
              <PrivateChatWindowProvider>
                <GameHeader player={player} notifications={notifications} />
                <GameSidebar username={player.username} />
                {children}
                <GlobalChatBar
                  initialMessages={globalChatMessages}
                  currentPlayerDisplayName={player.displayName}
                  currentPlayerUsername={session.user.username ?? null}
                />
                <SocialDock>
                  <FloatingPrivateChatWindow
                    currentPlayerDisplayName={player.displayName}
                    currentPlayerUsername={session.user.username ?? null}
                  />
                  <FriendsBar />
                </SocialDock>
                <FriendshipSyncWatcher />
                <PrivateMessagePopupWatcher />
                <PresenceHeartbeat />
              </PrivateChatWindowProvider>
            </FriendsDataProvider>
          </ActiveBattleProvider>
        </DailyBattleCountProvider>
      </PlayerProgressionProvider>
    </SoundSettingsProvider>
  );
}
