// Shared "DD/MM/YYYY HH:MM" (Asia/Jerusalem wall-clock, Hebrew/Israel-
// friendly numeric date order) formatter for chat message timestamps —
// used by BOTH Global Chat and Private Chat, on both the server (hydrating
// confirmed messages from their real createdAt) and the client (labeling
// the optimistic message shown the instant Send is clicked, before the
// server round trip confirms it). No "server-only" guard: pure
// Intl.DateTimeFormat logic with no DB/session access, safe to import from
// either side — same "plain shared calculation, no side effects" posture
// features/party/utils/party-rules.ts already has for its own dual server/
// client callers.
//
// Previously two near-identical HH:MM-only implementations per feature
// (one server-side in *.service.ts, one client-side in the polling hook) —
// centralized here so Global Chat and Private Chat can never drift apart on
// formatting again.
export function formatChatMessageTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}
