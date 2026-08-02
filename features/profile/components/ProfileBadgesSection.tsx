// Architectural placeholder only — this project has no badge/achievement
// ownership model yet (see this feature's own Phase 1 scope notes), so
// this deliberately never invents fake badge data. Renders a plain empty
// state; once a real badge system exists, this component becomes the one
// place that reads it and renders the owner's selected badges, without any
// other part of the profile page needing to change.
export function ProfileBadgesSection() {
  return (
    <section dir="rtl" className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-4">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">תגים</h2>
      <p className="text-center text-sm text-slate-500">אין עדיין תגים להצגה.</p>
    </section>
  );
}
