import { AchievementsPanel } from "./AchievementsPanel";
import { DailyBattleCounter } from "./DailyBattleCounter";
import { HomeFullScreenBackground } from "./HomeFullScreenBackground";
import { NavigationGrid } from "./NavigationGrid";
import { NewsPanel } from "./NewsPanel";
import { RefreshHomeOnMount } from "./RefreshHomeOnMount";
import { SignificantCapturesCard } from "./SignificantCapturesCard";
import { StatisticsPanel } from "./StatisticsPanel";
import { HomeChatPanel } from "@/features/chat/components/HomeChatPanel";
import { LevelUpDecisionsGate } from "@/features/move-learning/components/LevelUpDecisionsGate";
import { PartySection } from "@/features/pokemon/components/PartySection";
import { HomeTutorialCard } from "@/features/tutorial/components/HomeTutorialCard";
import { HomeTutorialReplayEntry } from "@/features/tutorial/components/HomeTutorialReplayEntry";
import type { HomeViewData } from "@/features/home/services/home-data.service";

interface HomeContentProps {
  data: HomeViewData;
  username: string | null;
  // GLOBAL CHAT — HOME EMBED. Passed separately from `data` — see
  // app/(game)/home/page.tsx's own doc comment for why this isn't part of
  // HomeViewData (a profile-level display field, deliberately kept out of
  // that type).
  currentPlayerDisplayName: string;
}

// The home hub's body, inside GameScreen's centered/rounded shell (same as
// MapContent/BattleContent). Owns its own scroll + background atmosphere;
// GameScreen just gives it a fixed-height container to fill.
//
// GLOBAL GAME BACKGROUND — visual experiment, Home only. This root div's
// ORIGINAL background (before this experiment; to fully restore Home's old
// look, revert to this exact className and remove the
// <HomeFullScreenBackground /> line below):
//   className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
// — the exact same class string every other page's own *Content.tsx root
// also copy-pastes independently (see GameScreen.tsx's own doc comment for
// why there's no single shared component to fix this everywhere at once);
// every other page's own Content component still uses it unchanged, only
// Home's own root was ever touched by this experiment.
//
// Tried, in order: (1) plain transparency, letting GameScreen's own fixed
// game-background.png layer show through — didn't read as intended; (2)
// the image set directly on this root div's own bg-cover/bg-center — showed
// an image, but `cover` computed against THIS root's own smaller boxed
// size (GameScreen's rounded 85%-width container), not the real viewport,
// so it read "framed differently" than AuthScreen's full-viewport version;
// (3) current: HomeFullScreenBackground portals a true fixed, full-viewport
// bg-cover/bg-center layer straight into document.body, bypassing
// GameScreen's box entirely (see that component's own doc comment) — this
// root div itself stays transparent (no bg-* class) so Home's own content
// simply sits on top of it, no overlay/scrim of any kind (the two
// radial-gradient accents below are pre-existing, unrelated, low-alpha
// additive glows, not overlays).
export function HomeContent({ data, username, currentPlayerDisplayName }: HomeContentProps) {
  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto">
      <HomeFullScreenBackground />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <RefreshHomeOnMount />
      <LevelUpDecisionsGate
        initialPendingEvolution={data.pendingEvolution}
        initialPendingEvolutionBranch={data.pendingEvolutionBranch}
        initialPendingMoveLearning={data.pendingMoveLearning}
      />

      {/* Z-INDEX FIX — explicit z-10 (was implicitly z-index:auto), so this
          wrapper — which holds every real piece of Home's content — stacks
          above HomeFullScreenBackground's own explicit z-0 fixed layer; see
          that component's own doc comment for why a plain `relative`
          without an explicit z-index wouldn't have been enough. */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <HomeTutorialCard />

        <div className="flex flex-wrap gap-3">
          <DailyBattleCounter count={data.dailyBattleCount} />
        </div>

        <PartySection party={data.party} emphasized />

        <NavigationGrid username={username} />

        <SignificantCapturesCard data={data.significantCaptures} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AchievementsPanel />
          <NewsPanel />
          <StatisticsPanel
            totalCaught={data.stats.totalCaught}
            dexCompletionPercent={data.stats.dexCompletionPercent}
            onlinePlayerCount={data.onlinePlayerCount}
          />
        </div>

        <HomeTutorialReplayEntry />

        <HomeChatPanel
          initialMessages={data.globalChatMessages}
          currentPlayerDisplayName={currentPlayerDisplayName}
          currentPlayerUsername={username}
        />
      </div>
    </div>
  );
}
