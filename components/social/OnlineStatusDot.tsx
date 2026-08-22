interface OnlineStatusDotProps {
  // Always the server's own authoritative presence calculation
  // (features/presence/services/presence.service.ts's isOnline, via
  // GlobalChatMessageView.isOnline / FriendSummary.isOnline) — never a
  // client guess.
  isOnline: boolean;
  className?: string;
}

// ONLINE PRESENCE — the one shared visual for online/offline status,
// reused by Global Chat (next to each message's sender, GlobalChatWindow.
// tsx) and the Friends Bar (next to each friend, FriendsBar.tsx) — never
// two separately-styled dots that could drift apart. Purely
// presentational: green = online, gray = offline, nothing else rendered
// (no exact lastSeenAt — this feature's own explicit privacy rule).
//
// ONLINE STATUS DOT — VISUAL. Online gets a bright green center plus a
// soft two-layer glow (a tight bright ring immediately around the dot,
// fading into a wider, softer halo) via a plain arbitrary box-shadow —
// deliberately no animation/pulse, so "noticeable but elegant" doesn't
// tip into distracting. Offline stays the plain flat gray dot with no
// shadow at all, so the glow itself is what reads as "actively online" at
// a glance.
export function OnlineStatusDot({ isOnline, className = "" }: OnlineStatusDotProps) {
  return (
    <span
      aria-label={isOnline ? "מחובר" : "לא מחובר"}
      title={isOnline ? "מחובר" : "לא מחובר"}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        isOnline
          ? "bg-emerald-400 shadow-[0_0_3px_1px_rgba(52,211,153,0.9),0_0_8px_3px_rgba(52,211,153,0.5)]"
          : "bg-slate-500"
      } ${className}`.trim()}
    />
  );
}
