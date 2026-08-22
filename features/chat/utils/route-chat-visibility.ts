// GLOBAL CHAT — HOME EMBED + AUTO-MINIMIZE ELSEWHERE. Pure route-decision
// logic, deliberately separated from GlobalChatBar.tsx itself so the
// route-driven collapse rule is unit-testable without a router/DOM harness
// (this project's established "no React-render/DOM harness" convention —
// see any *-boundary.test.ts file).
export const HOME_PATHNAME = "/home";

// Home is the one route that embeds its own chat panel directly in the
// page (features/chat/components/HomeChatPanel.tsx) — GlobalChatBar (the
// fixed overlay used everywhere else) renders nothing at all here.
export function isHomePathname(pathname: string): boolean {
  return pathname === HOME_PATHNAME;
}

// True exactly when a route change must force the overlay bar's minimized
// state back to collapsed — i.e. the player just LEFT Home for anywhere
// else. Every other transition (arriving at Home, or navigating between
// two non-Home pages) never forces a reset: arriving at Home is handled by
// GlobalChatBar simply rendering nothing there, and moving between two
// non-Home pages must never fight a player's own manual "keep it open
// while I browse" choice — only a Home visit resets the default.
export function shouldForceCollapseOnRouteChange(prevPathname: string, nextPathname: string): boolean {
  return isHomePathname(prevPathname) && !isHomePathname(nextPathname);
}
