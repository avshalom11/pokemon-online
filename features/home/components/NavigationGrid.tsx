"use client";

import { useState } from "react";

import { NavigationCard } from "./NavigationCard";
import { PlayerSearchModal } from "@/features/player-search/components/PlayerSearchModal";

interface NavigationGridProps {
  // Null only if the session somehow lacks a username (never expected in
  // practice) — the Profile card falls back to a disabled "coming soon"
  // state in that case rather than linking to a broken route.
  username: string | null;
}

const STATIC_NAVIGATION_ITEMS = [
  { title: "מחוזות", icon: "🌍", href: "/world" },
  { title: "מפה", icon: "🗺️", href: "/map" },
  { title: "הפוקימונים שלי", icon: "🐾", href: "/my-pokemon" },
  { title: "מרכז פוקימון", icon: "🏥", href: "/pokemon-center" },
  // NAVIGATION UPDATE — the existing /hatchery page (features/hatchery),
  // added through this same static config rather than a hardcoded card:
  // same emoji icon the sidebar's own Hatchery item already uses
  // (features/navigation/data/sidebar-menu.ts), so the two menus never
  // drift into disagreeing iconography for the same destination.
  { title: "מדגרה", icon: "🥚", href: "/hatchery" },
  // GYMS & LEAGUES PHASE 9 — small nav shortcuts only (section 26): the
  // sidebar already links to both (features/navigation/data/sidebar-menu.ts,
  // Phase 4/5), same icons reused here so the two menus never disagree, same
  // "small addition to the existing static list" precedent Hatchery above
  // already established — no redesign, no champion showcase on Home itself.
  { title: "מכונים", icon: "🏟️", href: "/gyms" },
  { title: "ליגות", icon: "🏆", href: "/leagues" },
  { title: "תיק ציוד", icon: "🎒", href: "/inventory" },
  { title: "פוקדקס", icon: "📖", href: "/pokedex" },
  { title: "חנות", icon: "🛒", href: "/shop" },
  // HOME QUICK ACCESS — same route + label/icon the sidebar's own
  // "שירותים וחנויות" category already uses for these two
  // (features/navigation/data/sidebar-menu.ts), reused verbatim here so the
  // two menus never drift into disagreeing wording/iconography for the
  // same destinations — no new route invented for either.
  { title: "שוק", icon: "🏪", href: "/marketplace" },
  { title: "מעון פוקימונים", icon: "🏡", href: "/daycare" },
] as const;

export function NavigationGrid({ username }: NavigationGridProps) {
  // HOME QUICK ACCESS — PLAYER SEARCH. Same "opens a modal in place, not a
  // route" action the sidebar's own "חיפוש שחקנים" entry already uses
  // (hasAction in features/navigation/data/sidebar-menu.ts, rendered as a
  // button by GameSidebar.tsx) — reusing the exact same PlayerSearchModal
  // component/flow here rather than a second search UI or a new route.
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <section dir="rtl">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">תפריט המשחק</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STATIC_NAVIGATION_ITEMS.map((item) => (
          <NavigationCard key={item.title} title={item.title} icon={item.icon} href={item.href} />
        ))}
        {/* Opens the authenticated player's own public profile page
            (/profile/[username] — features/profile) — the same page every
            other player's profile uses, with Edit Profile controls visible
            only because this player IS the owner viewing it. */}
        <NavigationCard
          title="פרופיל"
          icon="🧑"
          href={username ? `/profile/${username}` : undefined}
          comingSoon={!username}
        />
        <NavigationCard title="חיפוש שחקנים" icon="🔍" onClick={() => setIsSearchOpen(true)} />
      </div>

      {isSearchOpen ? <PlayerSearchModal onClose={() => setIsSearchOpen(false)} /> : null}
    </section>
  );
}
