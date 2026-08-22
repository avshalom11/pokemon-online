import { ProgressBar } from "@/components/battle/ProgressBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { DaycareCountdown } from "@/features/daycare/components/DaycareCountdown";
import { DAYCARE_DEPOSIT_FEE, DAYCARE_MAX_LEVELS_PER_STAY } from "@/features/daycare/config/daycare.config";
import type { DaycareActiveStayView } from "@/features/daycare/types";

interface DaycareActiveStayPanelProps {
  stay: DaycareActiveStayView;
  playerMoney: number;
  disabled: boolean;
  onPickup: () => void;
}

// SECTION 12 — one deposited Pokémon's own card (Phase 2: the /daycare
// page renders one of these per active stay, in a grid alongside empty-
// slot placeholders — see DaycareContent.tsx): sprite, name, level when
// deposited, earned levels X/10, expected level after pickup, current
// debt, time until next level, progress bar, current time-per-level
// bracket, and the pickup button — all scoped to THIS ONE stay alone.
// Every number here is read as-is from the server's own
// DaycareActiveStayView (features/daycare/services/daycare-view.
// service.ts) — nothing is recomputed client-side beyond the countdown's
// own display formatting (DaycareCountdown).
//
// PHASE 2 — SECTION 9. Explicitly distinguishes the already-paid,
// non-refundable deposit fee (a plain constant — never refetched or
// recomputed, since it's always the same DAYCARE_DEPOSIT_FEE for every
// stay) from the current UNPAID per-level debt (stay.debt) — the pickup
// button only ever charges the latter, never re-charges the former.
export function DaycareActiveStayPanel({ stay, playerMoney, disabled, onPickup }: DaycareActiveStayPanelProps) {
  const canAfford = playerMoney >= stay.debt;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center">
      <SpriteImage
        src={stay.spriteUrl}
        alt={stay.displayName}
        className="h-24 w-24 object-contain"
        fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
      />

      <div className="text-lg font-bold text-slate-100">{stay.displayName}</div>

      <p className="text-[11px] text-slate-500">
        דמי כניסה ששולמו: {DAYCARE_DEPOSIT_FEE.toLocaleString("he-IL")} כסף (לא מוחזרים)
      </p>

      <div className="grid w-full grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-800/60 p-2">
          <div className="text-slate-500">רמה בהפקדה</div>
          <div className="font-semibold">{stay.startingLevel}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 p-2">
          <div className="text-slate-500">רמה לאחר איסוף</div>
          <div className="font-semibold">{stay.effectiveLevel}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 p-2">
          <div className="text-slate-500">רמות שהורווחו</div>
          <div className="font-semibold">
            {stay.earnedLevels}/{DAYCARE_MAX_LEVELS_PER_STAY}
          </div>
        </div>
        <div className="rounded-lg bg-slate-800/60 p-2">
          <div className="text-slate-500">חוב מעון שטרם שולם</div>
          <div className={`font-semibold ${canAfford ? "text-slate-100" : "text-rose-400"}`}>{stay.debt.toLocaleString("he-IL")} כסף</div>
        </div>
        {!stay.progressionStopped ? (
          <>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <div className="text-slate-500">קצב נוכחי</div>
              <div className="font-semibold">{stay.hoursForNextLevel} שעות לרמה</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2">
              <div className="text-slate-500">מחיר לרמה הבאה</div>
              <div className="font-semibold">{stay.costForNextLevel?.toLocaleString("he-IL")} כסף</div>
            </div>
          </>
        ) : null}
      </div>

      <div className="w-full">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span>התקדמות במעון</span>
          <span dir="ltr">
            {stay.earnedLevels} / {DAYCARE_MAX_LEVELS_PER_STAY}
          </span>
        </div>
        <ProgressBar percent={stay.progressPercent} height="md" fillStyle={{ background: "linear-gradient(90deg, #34d399, #34d399cc)" }} />
      </div>

      {stay.progressionStopped ? (
        <p className="text-sm font-semibold text-emerald-400">
          {stay.stoppedReason === "maxLevel" ? "הפוקימון הגיע לרמה המקסימלית" : "הפוקימון השלים את ההתקדמות במעון"}
        </p>
      ) : stay.nextLevelDueAt ? (
        <p className="text-sm text-slate-300">
          <DaycareCountdown nextLevelDueAtIso={stay.nextLevelDueAt} />
        </p>
      ) : null}

      {!canAfford ? <p className="text-xs text-rose-400">אין לך מספיק כסף כדי להוציא את הפוקימון מהמעון</p> : null}

      <button
        type="button"
        disabled={disabled || !canAfford}
        onClick={onPickup}
        className="w-full rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {stay.debt > 0 ? `שלם ${stay.debt.toLocaleString("he-IL")} כסף ואסוף` : "אסוף את הפוקימון"}
      </button>
    </div>
  );
}
