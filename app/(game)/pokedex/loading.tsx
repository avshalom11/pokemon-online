import { GameScreen } from "@/components/layout/GameScreen";

// Reuses the same GameScreen shell PokedexContent renders into, so this
// fallback occupies exactly the same space with no layout shift once the
// real content streams in — same idiom every other game page's loading.tsx
// already follows.
export default function Loading() {
  return (
    <GameScreen>
      <div className="h-full w-full animate-pulse bg-slate-900/40" />
    </GameScreen>
  );
}
