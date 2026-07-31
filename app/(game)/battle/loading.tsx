import { BattleWindow } from "@/features/battle/components/BattleWindow";

// Reuses BattleWindow's own shell (background, centered/sized panel) so the
// loading state occupies exactly the same space the real battle scene will
// — no layout shift once data streams in. See loading.js's own file-
// convention docs: this is prefetched together with the route, so it's what
// actually appears the instant a player clicks a zone on the Map, while
// getBattleViewData resolves server-side.
export default function Loading() {
  return (
    <BattleWindow>
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-900/40">
        <div className="h-16 w-16 rounded-full bg-slate-700/50" />
      </div>
    </BattleWindow>
  );
}
