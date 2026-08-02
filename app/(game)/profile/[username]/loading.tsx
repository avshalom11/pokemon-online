import { GameScreen } from "@/components/layout/GameScreen";

// Same "reuse the exact GameScreen shell, zero layout shift" idiom every
// other game page's loading.tsx already follows.
export default function Loading() {
  return (
    <GameScreen>
      <div className="h-full w-full animate-pulse bg-slate-900/40" />
    </GameScreen>
  );
}
