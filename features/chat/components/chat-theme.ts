// GLOBAL CHAT — the one shared visual theme both chat presentations use
// (GlobalChatBar's fixed overlay everywhere except Home; HomeChatPanel's
// embedded page section on Home) — see each component's own doc comment.
// A slightly darker blue-purple tint with an indigo/violet accent border,
// deliberately distinct from the app's generic panels (PanelCard's own
// neutral bg-slate-900/60 + border-white/10 — see features/home/components/
// PanelCard.tsx), so the chat reads as its own kind of surface at a glance.
// Kept readable and non-bright: body text stays plain slate-100/200, only
// the sender name and accents pick up the violet tint.
export const CHAT_ACCENT_BORDER_COLOR_CLASSNAME = "border-indigo-400/25";
export const CHAT_PANEL_BORDER_CLASSNAME = `border ${CHAT_ACCENT_BORDER_COLOR_CLASSNAME}`;
export const CHAT_PANEL_BG_CLASSNAME = "bg-gradient-to-b from-indigo-950/90 via-slate-950/95 to-slate-950/95";
export const CHAT_HEADER_BG_CLASSNAME = "bg-indigo-950/60";
export const CHAT_ACCENT_TEXT_CLASSNAME = "text-violet-300";
export const CHAT_INPUT_CLASSNAME =
  "flex-1 rounded-lg border border-indigo-400/20 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/60 focus:outline-none";
export const CHAT_SEND_BUTTON_CLASSNAME =
  "rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400";
