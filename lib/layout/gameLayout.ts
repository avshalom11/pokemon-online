// Shared page-shell sizing, used by components/layout/GameScreen.tsx and
// reused across every full-screen game surface (Battle now; Map, Inventory,
// Shop, Profile, etc. later) so they all frame content the same way.

// Space reserved above every game screen for the future global game header
// (player avatar/level/gold/gems/energy/notifications/settings — not built
// yet). The actual value lives in the --app-header-height CSS custom
// property in app/globals.css; this constant just documents it and must be
// kept in sync if that value ever changes.
export const APP_HEADER_HEIGHT_PX = 64;

// The centered content container's target width and cap, matching what
// GameScreen renders (w-[85%] max-w-[1400px] in Tailwind terms). Kept here
// purely as documentation for anything that needs the numbers outside CSS.
export const GAME_CONTAINER_WIDTH_PERCENT = 85;
export const GAME_CONTAINER_MAX_WIDTH_PX = 1400;
