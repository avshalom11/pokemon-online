// Battle screens in this codebase render their own full-bleed shell
// (BattleWindow) rather than GameScreen — no useful skeleton to show
// before that mounts, same convention app/(game)/gyms/battle/loading.tsx
// already uses.
export default function Loading() {
  return <div className="min-h-dvh bg-slate-950" />;
}
