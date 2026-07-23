import { PanelCard } from "./PanelCard";

interface StatisticsPanelProps {
  totalCaught: number;
  dexCompletionPercent: number;
}

// Mixes real, computed values (caught count, dex completion — both derived
// from actual PlayerPokemon rows in home-data.service.ts) with honest
// placeholders for stats no model tracks yet (battles won, play time),
// rather than fabricating numbers for those.
export function StatisticsPanel({ totalCaught, dexCompletionPercent }: StatisticsPanelProps) {
  const stats = [
    { label: "פוקימונים שנתפסו", value: totalCaught.toString() },
    { label: "השלמת פוקידקס", value: `${dexCompletionPercent}%` },
    { label: "קרבות שנוצחו", value: "בקרוב" },
    { label: "זמן משחק", value: "בקרוב" },
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
      </dl>
    </PanelCard>
  );
}
