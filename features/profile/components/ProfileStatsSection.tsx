import type { PublicStatsView } from "../types/profile.types";

interface ProfileStatsSectionProps {
  stats: PublicStatsView | null;
}

// `stats` is already null here whenever the owner has hidden this section
// (see public-profile-view.service.ts) — renders nothing at all in that
// case, same "hidden means absent, not an empty section" convention
// ProfileAboutMe follows. Deliberately no "battles won" row — Phase 1 has
// no reliable lifetime counter to show (see PublicStatsView's own doc
// comment); adding one later is a data-model change, not a UI change.
export function ProfileStatsSection({ stats }: ProfileStatsSectionProps) {
  if (!stats) return null;

  return (
    <section dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">סטטיסטיקות</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="רמת מאמן" value={stats.trainerLevel} />
        <StatTile label="פוקימונים שנצפו" value={stats.pokedexSeenCount} />
        <StatTile label="פוקימונים שנתפסו" value={stats.pokedexCaughtCount} />
        <StatTile label='סה"כ פוקימונים' value={stats.totalOwnedPokemon} />
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-950/40 p-3 text-center">
      <dd dir="ltr" className="text-lg font-bold text-slate-100">
        {value.toLocaleString("he-IL")}
      </dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}
