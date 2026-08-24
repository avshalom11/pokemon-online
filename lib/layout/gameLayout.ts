// Shared page-shell sizing, used by components/layout/GameScreen.tsx and
// reused across every full-screen game surface (Battle now; Map, Inventory,
// Shop, Profile, etc. later) so they all frame content the same way.

// Space reserved above every game screen for the global game header
// (components/layout/GameHeader.tsx). The actual value lives in the
// --app-header-height CSS custom property in app/globals.css (which also
// defines a taller mobile override below the sm: breakpoint); this constant
// documents the desktop baseline and must be kept in sync if that value
// ever changes.
export const APP_HEADER_HEIGHT_PX = 64;

// GLOBAL CHAT — the collapsed chat bar's height (features/chat/components/
// GlobalChatBar.tsx). The actual value lives in the --app-chat-bar-height
// CSS custom property in app/globals.css; this constant documents it and
// must be kept in sync if that value ever changes.
export const APP_CHAT_BAR_HEIGHT_PX = 44;

// The centered content container's target width and cap, matching what
// GameScreen renders (w-[85%] max-w-[1400px] in Tailwind terms). Kept here
// purely as documentation for anything that needs the numbers outside CSS.
export const GAME_CONTAINER_WIDTH_PERCENT = 85;
export const GAME_CONTAINER_MAX_WIDTH_PX = 1400;

// RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. The right navigation
// sidebar's real rendered width (components/layout/GameSidebar.tsx's own
// aside panel, and its toggle button's "just outside the open panel"
// offset) — clamped to 85% of the viewport on very narrow screens so it
// never overflows there. The one shared source of this number: every other
// fixed-position UI anchored to the right edge (FriendsBar/SocialDock,
// GlobalChatBar) reads this same constant to shift/resize itself out from
// under the sidebar while it's open, instead of each hardcoding its own
// guess at the sidebar's width that could drift out of sync.
export const SIDEBAR_PANEL_WIDTH_CSS = "min(18rem, 85vw)";
