import Link from "next/link";
import type { ReactNode } from "react";

interface PlayerProfileLinkProps {
  // Nullable/undefined so any caller that only has a possibly-absent
  // username (a legacy row, a not-yet-hydrated session) can pass it through
  // directly rather than pre-checking itself — see the plain-text fallback
  // below.
  username: string | null | undefined;
  className?: string;
  children?: ReactNode;
}

// The ONE reusable way any page links to a player's public profile
// (/profile/[username]) — every future surface that displays a username
// (chat, rankings, friends, PvP) should use this instead of hand-rolling
// its own `<Link href={`/profile/${username}`}>`, so the route shape only
// ever needs to change in one place. Falls back to plain, non-interactive
// text when no username is available, rather than ever linking to a
// broken/empty route.
export function PlayerProfileLink({ username, className, children }: PlayerProfileLinkProps) {
  const label = children ?? username;

  if (!username) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link href={`/profile/${encodeURIComponent(username)}`} className={className}>
      {label}
    </Link>
  );
}
