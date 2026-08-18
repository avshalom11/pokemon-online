// Battle screens in this codebase render their own full-bleed shell
// (BattleWindow) rather than GameScreen — no useful skeleton to show
// before that mounts, same "blank until ready" convention
// app/(game)/battle/loading.tsx would use if it needed one.
export default function Loading() {
  return <div className="min-h-dvh bg-slate-950" />;
}
