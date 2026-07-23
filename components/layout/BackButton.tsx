"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  // Where to send the player when there's no real browser history to go
  // back to (e.g. this page was opened directly/in a new tab). Defaults to
  // /home since that's the game's central hub every page is reachable from.
  fallbackHref?: string;
  className?: string;
}

// The standard "go back" control for game pages (first used on My Pokémon).
// Prefers real browser history (router.back()) so it never creates a
// duplicate/forward-dead-end entry; only falls back to a fresh navigation
// when there's nothing to go back to. Intentionally generic (no
// feature-specific props) so any future page can drop it in unchanged —
// do not fork or re-implement this per page.
export function BackButton({ fallbackHref = "/home", className }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-slate-800"
      }
    >
      <span aria-hidden="true">⬅</span>
      חזור
    </button>
  );
}
