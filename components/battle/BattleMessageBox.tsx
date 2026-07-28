import { MESSAGE_BOX_MAX_WIDTH_CLASS, MESSAGE_BOX_WIDTH_CLASS } from "@/lib/battle/battleLayout";
import type { BattleTheme } from "@/shared/types/battle-theme";

interface BattleMessageBoxProps {
  theme: BattleTheme;
  message?: string;
}

// Sized for the message it actually holds, not a fixed-height box: min-h
// keeps a stable one-line footprint so ordinary short messages (most attack/
// switch/faint text) never cause the footer beneath it to jump in height,
// while line-clamp-2 + overflow-hidden caps it at two lines so even an
// unusually long message can never grow it further. Width is deliberately
// narrower than the footer's full span, and left-aligned rather than
// centered (MESSAGE_BOX_WIDTH_CLASS/MESSAGE_BOX_MAX_WIDTH_CLASS,
// lib/battle/battleLayout.ts) — the player's HP/XP card is positioned
// independently of the footer (PLAYER_HUD_TOP_PERCENT, same file) and
// pinned to the right edge, so anchoring this box to the footer's left
// edge instead keeps it structurally over the Attack Panel's column, far
// from that card, rather than merely narrower than the full width. Same
// border/background/shadow/accent-bar visual treatment as before — only
// the sizing/alignment mechanics changed.
//
// dir="rtl" on the text itself: every battle message is Hebrew-first with
// embedded English Pokémon names/usernames (see
// features/battle/utils/battle-messages.ts) — without an explicit base
// direction here, the browser has no RTL paragraph context to resolve
// against, and punctuation/word order can drift. The embedded Latin-script
// names still render left-to-right on their own within the RTL paragraph;
// that's the browser's standard bidi handling, not something this component
// needs to do manually.
export function BattleMessageBox({ theme, message }: BattleMessageBoxProps) {
  return (
    <div
      className={`relative flex min-h-[2rem] items-center overflow-hidden rounded-lg border border-white/10 bg-slate-900/80 px-4 py-1.5 text-sm font-medium tracking-wide text-slate-100 shadow-xl backdrop-blur-md sm:min-h-[2.25rem] sm:text-base ${MESSAGE_BOX_WIDTH_CLASS} ${MESSAGE_BOX_MAX_WIDTH_CLASS}`}
      style={{ boxShadow: "0 12px 30px -18px rgba(0,0,0,0.7)" }}
    >
      <div className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: theme.colors.panelAccent }} />
      <span dir="rtl" className="line-clamp-2 text-center">
        {message ?? " "}
      </span>
    </div>
  );
}
