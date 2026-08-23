export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string;
  // Undefined only for the one item (Profile) whose real route needs data
  // this static table can't hold on its own — see buildSidebarCategories
  // below. Every other item is a plain, always-resolvable existing route.
  href?: string;
  // PLAYER SEARCH — true for the one item (today: "player-search") that
  // isn't a route at all but a client-side action (opens a modal/panel in
  // place) — GameSidebar.tsx renders it as a button instead of a Link, but
  // still gates it behind the exact same battle-lock check every real link
  // already gets (never a second lock system). Distinct from a plain
  // missing `href` (Profile's own "not resolved yet" state above), which
  // still renders the inert "coming soon" treatment, never this button.
  hasAction?: boolean;
}

export interface SidebarCategory {
  id: string;
  label: string;
  items: SidebarMenuItem[];
}

// The right sidebar's own menu data (components/layout/GameSidebar.tsx) —
// kept fully separate from rendering so a future category/item is a data
// edit here, never a JSX change. Every href below is a real, already-shipped
// route (verified against app/(game)/*/page.tsx) — the exact same
// label/icon/href triples features/home/components/NavigationGrid.tsx
// already established for Home's own nav grid, reused here rather than
// re-invented, so the two menus never drift into disagreeing wording for
// the same destination. Pokédex is deliberately excluded — the task's own
// category spec doesn't ask for it here, and NavigationGrid already covers
// it on Home.
export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    id: "world",
    label: "עולם",
    items: [
      // NAVIGATION UPDATE — the game's main/home screen (app/(game)/home/
      // page.tsx), placed first in this category rather than a new one: it's
      // the screen every other item here is reached FROM, so it belongs
      // beside World/Map, not off on its own. Inherits the exact same
      // generic battle-lock behavior every other sidebar item already gets
      // from GameSidebar's own isActiveBattle check — no Home-specific
      // logic added.
      { id: "home", label: "מסך ראשי", icon: "🏠", href: "/home" },
      { id: "world", label: "מחוזות", icon: "🌍", href: "/world" },
      { id: "map", label: "מפה", icon: "🗺️", href: "/map" },
      // GYMS & LEAGUES PHASE 4 — placed right after World/Map, per this
      // Phase's own nav spec. Inherits the exact same battle-lock behavior
      // every other sidebar item already gets from GameSidebar's own
      // isActiveBattle check (now seeded from BOTH Field Battle and NPC
      // battle sessions — see app/(game)/layout.tsx) — no Gym-specific
      // navigation-lock logic added.
      { id: "gyms", label: "מכונים", icon: "🏟️", href: "/gyms" },
      // GYMS & LEAGUES PHASE 5 — placed right after Gyms, the natural
      // progression: World -> Map -> Gyms -> Leagues. Inherits the same
      // generic battle-lock behavior every other sidebar item already gets
      // from GameSidebar's own isActiveBattle check — no League-specific
      // navigation-lock logic added (this Phase implements no PvP battle
      // screen yet anyway).
      { id: "leagues", label: "ליגות", icon: "🏆", href: "/leagues" },
    ],
  },
  {
    id: "services",
    label: "שירותים וחנויות",
    items: [
      { id: "shop", label: "חנות", icon: "🛒", href: "/shop" },
      { id: "pokemon-center", label: "מרכז פוקימון", icon: "🏥", href: "/pokemon-center" },
      // EGGS PHASE 7 — the existing /hatchery page (Phase 5), placed under
      // this same category rather than a new one: it's a service the
      // player visits, same shape as Shop/Pokémon Center. Inherits the
      // exact same battle-lock behavior every other item here already
      // gets from GameSidebar's own generic isActiveBattle check — no
      // Hatchery-specific logic added.
      { id: "hatchery", label: "מדגרה", icon: "🥚", href: "/hatchery" },
      // POKÉMON DAYCARE — PHASE 1 — placed right after Hatchery, the
      // natural grouping: both are "deposit something, wait, come back to
      // collect" services. Inherits the exact same battle-lock behavior
      // every other item here already gets from GameSidebar's own generic
      // isActiveBattle check — no Daycare-specific navigation-lock logic
      // added.
      { id: "daycare", label: "מעון פוקימונים", icon: "🏡", href: "/daycare" },
    ],
  },
  {
    id: "account",
    label: "החשבון שלי",
    items: [
      { id: "inventory", label: "תיק ציוד", icon: "🎒", href: "/inventory" },
      // href resolved by buildSidebarCategories below (needs the current
      // player's own username, not static data).
      { id: "profile", label: "פרופיל", icon: "🧑" },
      { id: "team", label: "הפוקימונים שלי", icon: "🐾", href: "/my-pokemon" },
      // PLAYER SEARCH — opens a compact search panel in place
      // (features/player-search/components/PlayerSearchModal.tsx) rather
      // than navigating anywhere; see hasAction's own doc comment above.
      { id: "player-search", label: "חיפוש שחקנים", icon: "🔍", hasAction: true },
    ],
  },
];

// Fills in the one genuinely dynamic route (/profile/[username], same
// pattern features/profile/components/PlayerProfileLink.tsx already
// established) — everything else passes through untouched. `username` null
// only if the session somehow lacks one (never expected in practice); the
// Profile item is simply left without an href in that case, same
// "coming-soon, never a broken link" rule NavigationGrid's own Profile card
// already follows.
export function buildSidebarCategories(username: string | null): SidebarCategory[] {
  return SIDEBAR_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.map((item) =>
      item.id === "profile" ? { ...item, href: username ? `/profile/${encodeURIComponent(username)}` : undefined } : item
    ),
  }));
}
