import type { ReactNode } from "react";

interface GameScreenProps {
  children: ReactNode;
}

// Shared full-screen shell for every major game surface (Battle now; Map,
// Inventory, Shop, Profile, etc. later reuse the same component). Owns:
//   - the space reserved above for the future global header
//     (--app-header-height, set in app/globals.css)
//   - a centered, capped-width "premium app" container (~85% width, up to
//     ~1400px, comfortable margins, rounded corners, subtle shadow)
// The page's own content (e.g. BattleScene) just fills this container —
// it never needs to know about header space or container sizing itself.
export function GameScreen({ children }: GameScreenProps) {
  return (
    <div className="flex h-dvh flex-col bg-slate-950 pt-[var(--app-header-height)]">
      <div className="flex-1 overflow-hidden p-3 sm:p-5 lg:p-6">
        <div className="mx-auto h-full w-[85%] max-w-[1400px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10">
          {children}
        </div>
      </div>
    </div>
  );
}
