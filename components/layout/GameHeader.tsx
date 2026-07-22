import { logoutAction } from "@/lib/auth/actions";

// Temporary: only a logout action for now. Deliberately a small, modular
// piece (not baked into GameScreen or any page) so it can grow into a full
// player header (avatar, level, gold, gems, energy, notifications,
// settings — see AI_CONTEXT.md) without the pages that render it changing.
//
// Fixed-position, sized via the same --app-header-height variable
// GameScreen already reserves space for, so it drops into that existing
// gap without GameScreen or BattleScene needing any change.
export function GameHeader() {
  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-md sm:px-6"
      style={{ height: "var(--app-header-height)" }}
    >
      <span className="font-fantasy text-sm font-semibold text-slate-200 sm:text-base">Monster Online</span>

      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-slate-800"
        >
          התנתק
        </button>
      </form>
    </header>
  );
}
