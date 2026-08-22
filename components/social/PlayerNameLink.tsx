import Link from "next/link";

interface PlayerNameLinkProps {
  // null whenever the caller's own server-side resolution (getPlayerIdentitiesByIds
  // — lib/auth/player-profile.ts) couldn't find a real username for this
  // player — renders as plain, non-interactive text in that case rather
  // than a broken/dead link. Never guessed or reconstructed client-side.
  username: string | null;
  displayName: string;
  className?: string;
}

// CLICKABLE USERNAMES — the one shared control every social UI surface
// (Global Chat, Private Chat, Friends list/requests, Significant Captures,
// ...) renders a player's name through, so "clicking a name goes to
// /profile/<username>" is implemented exactly once. Reuses the existing
// /profile/[username] route directly — never a second profile page/view.
// A plain <span> fallback (no username resolved) is intentionally NOT a
// link at all, never a link to a broken/empty path.
export function PlayerNameLink({ username, displayName, className }: PlayerNameLinkProps) {
  if (!username) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Link href={`/profile/${encodeURIComponent(username)}`} className={`${className ?? ""} hover:underline`.trim()}>
      {displayName}
    </Link>
  );
}
