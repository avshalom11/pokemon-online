// PHASE 2 — 5 SLOTS. One free/unused Daycare slot, rendered so the grid of
// DAYCARE_MAX_SLOTS cards always visually reads as a complete "X/5" picture
// (occupied cards + this placeholder for the rest) — see DaycareContent.tsx,
// the only caller, for how many of these it renders (DAYCARE_MAX_SLOTS
// minus however many active stays currently exist).
export function DaycareEmptySlotCard() {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-slate-900/20 p-5 text-center">
      <span className="text-2xl text-slate-600" aria-hidden="true">
        ➕
      </span>
      <span className="text-sm font-semibold text-slate-500">פנוי</span>
    </div>
  );
}
