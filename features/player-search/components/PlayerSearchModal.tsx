"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { searchPlayersByUsernameAction } from "@/features/player-search/actions/player-search.actions";
import type { PlayerSearchResultView } from "@/features/player-search/types";

interface PlayerSearchModalProps {
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

// PLAYER SEARCH — the compact search panel opened from the right sidebar's
// "חיפוש שחקנים" control (components/layout/GameSidebar.tsx). Same modal
// chrome (fixed inset-0 backdrop, rounded card, ✕ close button) as
// EditProfileModal.tsx, so it reads as part of the existing design rather
// than a bolted-on new pattern. Every search goes through the one server
// action (searchPlayersByUsernameAction -> player-search.service.ts's
// searchPlayersByUsername) — never a direct Prisma query here.
export function PlayerSearchModal({ onClose }: PlayerSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResultView[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlayersByUsernameAction(trimmed).then((fresh) => {
        if (cancelled) return;
        setResults(fresh);
        setIsSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-slate-100">חיפוש שחקנים</h2>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="הקלידו שם משתמש..."
          autoFocus
          className="mt-4 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
        />

        <div className="mt-4 flex-1 overflow-y-auto">
          {query.trim().length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">הקלידו שם משתמש כדי לחפש שחקנים.</p>
          ) : isSearching ? (
            <p className="py-6 text-center text-sm text-slate-500">מחפש...</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">לא נמצאו שחקנים תואמים.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((result) => (
                <li key={result.username}>
                  <Link
                    href={`/profile/${encodeURIComponent(result.username)}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
                  >
                    {result.avatarUrl ? (
                      <SpriteImage
                        src={result.avatarUrl}
                        alt={result.displayName}
                        className="h-9 w-9 shrink-0 object-contain"
                        fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                        {result.displayName.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-100">{result.displayName}</span>
                      <span dir="ltr" className="text-xs text-slate-500">{`@${result.username}`}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
