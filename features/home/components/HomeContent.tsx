import { AchievementsPanel } from "./AchievementsPanel";
import { NavigationGrid } from "./NavigationGrid";
import { NewsPanel } from "./NewsPanel";
import { StatisticsPanel } from "./StatisticsPanel";
import { PartySection } from "@/features/pokemon/components/PartySection";
import type { HomeViewData } from "@/features/home/services/home-data.service";

interface HomeContentProps {
  data: HomeViewData;
}

// The home hub's body, inside GameScreen's centered/rounded shell (same as
// MapContent/BattleContent). Owns its own scroll + background atmosphere;
// GameScreen just gives it a fixed-height container to fill.
export function HomeContent({ data }: HomeContentProps) {
  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <PartySection party={data.party} />

        <NavigationGrid />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AchievementsPanel />
          <NewsPanel />
          <StatisticsPanel
            totalCaught={data.stats.totalCaught}
            dexCompletionPercent={data.stats.dexCompletionPercent}
          />
        </div>
      </div>
    </div>
  );
}
