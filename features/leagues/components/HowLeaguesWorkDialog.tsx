"use client";

import type { ReactNode } from "react";

import { LEAGUE_I } from "@/features/leagues/data/league-registry";
import { LEAGUE_SCHEDULE } from "@/features/leagues/config/league-schedule.config";
import { CYCLE_WEEK_LABELS } from "@/features/leagues/data/league-cycle-labels";
import type { LeaguesOverviewView } from "@/features/leagues/services/league-view.service";

interface HowLeaguesWorkDialogProps {
  cycle: LeaguesOverviewView["cycle"];
  onClose: () => void;
}

// LEAGUE CYCLE ALIGNMENT + "HOW LEAGUES WORK" DIALOG (later task) — a
// friendly, sectioned explainer, opened from /leagues without navigating
// away. Every NUMBER shown here is read straight off the real
// source-of-truth config/registry/view-model this codebase already
// maintains (LEAGUE_SCHEDULE, LEAGUE_I's own eligibility numbers — shared
// by all 3 regional Leagues, `cycle` — the SAME LeaguesOverviewView.cycle
// LeaguesContent's own top banner already renders via CYCLE_WEEK_LABELS,
// imported from there rather than duplicated) — never a second, hand-typed
// copy of a schedule time, eligibility requirement, or "which League is
// active" fact that could silently drift from the real behavior. The
// tie-break/no-show/reward RULES themselves are static approved prose
// (mirroring the exact behavior league-tiebreak.ts/league-match-
// resolution.service.ts/the reward-exclusivity note already implement) —
// deliberately never the internal 4th "deterministic fallback" tie-break
// step, which is a technical-only safeguard, never a rule shown to
// players.
export function HowLeaguesWorkDialog({ cycle, onClose }: HowLeaguesWorkDialogProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-slate-100">איך הליגות עובדות?</h2>

        <div className="mt-4 flex flex-col gap-4">
          <Section title="מהי הליגה?">
            <p>טורניר שבועי מול שחקנים אמיתיים אחרים — ניצחון בקרב מקדם אתכם לסיבוב הבא, עד לגמר.</p>
          </Section>

          <Section title="מחזור הליגות">
            <p className="font-semibold text-slate-200">ליגה 1 ← ליגה 2 ← ליגה 3 ← ליגת האלופים</p>
            <p className="mt-1">בכל שבוע פעילה ליגה אחת בלבד מתוך המחזור. לאחר שליגת האלופים מסתיימת, מתחיל מחזור חדש מחדש מליגה 1.</p>
            <p className="mt-2 rounded-lg border border-indigo-400/30 bg-indigo-950/30 px-3 py-1.5 text-indigo-200">
              השבוע פעילה: <span className="font-semibold">{CYCLE_WEEK_LABELS[cycle.weekIndexInCycle]}</span>
            </p>
          </Section>

          <Section title="הרשמה">
            <p>
              כדי להירשם לליגה אזורית (ליגה 1/2/3) יש לעמוד בדרישות הזכאות שלה — {LEAGUE_I.requiredBadgeCount} עיטורי מכון ו-
              {LEAGUE_I.requiredRegionalChampionCount} ניצחונות על מנהלי מחוז — ולהירשם באותו שבוע שבו הליגה פעילה במחזור.
            </p>
            <p className="mt-1">ההרשמה נסגרת: יום חמישי בשעה {LEAGUE_SCHEDULE.registrationClosesTime}.</p>
            <p className="mt-1 text-amber-300/90">ליגת האלופים: אין הרשמה ידנית — המשתתפים מעפילים מהליגות של אותו מחזור.</p>
          </Section>

          <Section title="זמני הקרבות">
            <ul className="list-inside list-disc space-y-0.5">
              <li>הטורניר מתחיל ביום חמישי בשעה {LEAGUE_SCHEDULE.round1StartsTime}</li>
              <li>כל סיבוב חדש מתחיל {LEAGUE_SCHEDULE.minutesBetweenRounds} דקות לאחר הקודם</li>
              <li>חדר הקרב פתוח למשך {LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes} דקות</li>
            </ul>
          </Section>

          <Section title="אי-הגעה">
            <p>אם אף אחד מהשחקנים לא נכנס לחדר הקרב — הזוכה נבחר באקראי. אם רק שחקן אחד נכנס — אותו שחקן מנצח אוטומטית.</p>
          </Section>

          <Section title="הזמן נגמר באמצע הקרב">
            <p>אם הקרב לא הוכרע עד לסגירת החדר, הניצחון נקבע לפי הסדר הבא:</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              <li>יותר פוקימונים חיים</li>
              <li>Player Level גבוה יותר</li>
              <li>מי שנכנס ראשון לחדר הקרב</li>
            </ol>
          </Section>

          <Section title="שחקן מחשב">
            <p>כשמספר הנרשמים לסיבוב אי-זוגי, שחקן אחד מתמודד מול יריב מחשב — קבוצה הוגנת ברמה שלכם, כדי שאף אחד לא יישאר בלי קרב.</p>
          </Section>

          <Section title="עלייה לשלב הבא">
            <p>ניצחון בקרב מקדם אתכם אוטומטית לסיבוב הבא בטורניר, עד לגמר.</p>
          </Section>

          <Section title="ליגת האלופים">
            <p>ארבעת המעפילים לליגת האלופים, כולם מאותו מחזור שהסתיים:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>הזוכה בליגה 1</li>
              <li>הזוכה בליגה 2</li>
              <li>הזוכה בליגה 3</li>
              <li>המקום השני בליגה 3</li>
            </ul>
          </Section>

          <Section title="פרסים">
            <p>מקומות 1, 2 ו-3 מקבלים את פרס המקום שלהם. שאר המשתתפים האמיתיים מקבלים פרס השתתפות.</p>
            <p className="mt-1 text-slate-400">שלושת המקומות הראשונים אינם מקבלים גם פרס השתתפות — לעולם לא שניהם יחד.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <h3 className="text-xs font-semibold tracking-wide text-indigo-300">{title}</h3>
      <div className="mt-1.5 text-xs leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}
