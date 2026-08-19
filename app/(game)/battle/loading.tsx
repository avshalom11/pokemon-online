import { BattleWindow } from "@/features/battle/components/BattleWindow";
import { FIELD_BATTLE_MUSIC_PATH } from "@/features/battle/utils/battle-music";

// Reuses BattleWindow's own shell (background, centered/sized panel) so the
// loading state occupies exactly the same space the real battle scene will
// — no layout shift once data streams in. See loading.js's own file-
// convention docs: this is prefetched together with the route, so it's what
// actually appears the instant a player clicks a zone on the Map, while
// getBattleViewData resolves server-side.
//
// FIELD BATTLE MUSIC — WRONG TRACK FLASH ON ENTRY (later task) — this
// mounts its own BattleWindow instance (Suspense fallbacks and the real
// streamed-in page are never the same React mount), so it must pass the
// exact same musicTrack the real BattleContent.tsx does — omitting it
// used to default to the shared Gym/League battle-theme.mp3, which is
// what played for the first second or so of every Field Battle before the
// real page swapped in and corrected it. Gym/League's own loading.tsx
// files deliberately render no BattleWindow at all (a blank div — see
// their own doc comments) specifically so they never have this same
// possible-wrong-track window; this file keeps BattleWindow only for its
// skeleton UX, so it must carry the correct track itself instead.
export default function Loading() {
  return (
    <BattleWindow musicTrack={FIELD_BATTLE_MUSIC_PATH}>
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-900/40">
        <div className="h-16 w-16 rounded-full bg-slate-700/50" />
      </div>
    </BattleWindow>
  );
}
