import { OnlinePlayerCountStat } from "./OnlinePlayerCountStat";
import { PanelCard } from "./PanelCard";

interface StatisticsPanelProps {
  totalCaught: number;
  dexCompletionPercent: number;
  // HOME STATISTICS — ONLINE PLAYERS. Replaces the old static "זמן משחק"
  // (play time) placeholder tile — see OnlinePlayerCountStat's own doc
  // comment for why this is a relocation of the existing Presence-backed
  // live count, never a second "online" definition.
  onlinePlayerCount: number;
}

// Mixes real, computed values (caught count, dex completion — both derived
// from actual PlayerPokemon rows in home-data.service.ts — and the live
// online-player count) with an honest placeholder for the one stat no model
// tracks yet (battles won), rather than fabricating a number for it.
export function StatisticsPanel({ totalCaught, dexCompletionPercent, onlinePlayerCount }: StatisticsPanelProps) {
  const stats = [
    { label: "פוקימונים שנתפסו", value: totalCaught.toString() },
    { label: "השלמת פוקידקס", value: `${dexCompletionPercent}%` },
    { label: "קרבות שנוצחו", value: "בקרוב" },
  ];

  return (
    <PanelCard title="סטטיסטיקות">
      <dl className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-950/40 p-2.5 text-center">
            <dd className="text-lg font-bold text-slate-100">{stat.value}</dd>
            <dt className="text-[11px] text-slate-500">{stat.label}</dt>
          </div>
        ))}
        <OnlinePlayerCountStat initialCount={onlinePlayerCount} />
      </dl>
    </PanelCard>
  );
}
