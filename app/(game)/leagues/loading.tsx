import { GameScreen } from "@/components/layout/GameScreen";

// Reuses the same GameScreen shell LeaguesContent renders into — same
// convention as app/(game)/gyms/loading.tsx.
export default function Loading() {
  return (
    <GameScreen>
      <div className="h-full w-full animate-pulse bg-slate-900/40" />
    </GameScreen>
  );
}
