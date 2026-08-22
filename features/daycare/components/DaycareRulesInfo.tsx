import {
  DAYCARE_DEPOSIT_FEE,
  DAYCARE_MAX_LEVELS_PER_STAY,
  DAYCARE_MAX_POKEMON_LEVEL,
  DAYCARE_MAX_SLOTS,
  getDaycareCostBrackets,
  getDaycareTimingBrackets,
} from "@/features/daycare/config/daycare.config";

function formatLevelRange(previousMax: number, maxLevel: number): string {
  const from = previousMax + 1;
  return maxLevel === Infinity ? `${from}+` : from === maxLevel ? `${maxLevel}` : `${from}–${maxLevel}`;
}

// SECTION 14 — DAYCARE RULES EXPLANATION. Pure display, reading directly
// from daycare.config.ts's own exported brackets (getDaycareTimingBrackets/
// getDaycareCostBrackets) rather than a second, hand-copied table — this
// component can never drift out of sync with the real approved values,
// since it renders the exact same arrays getDaycareHoursForNextLevel/
// getDaycareCostForNextLevel compute from.
export function DaycareRulesInfo() {
  const timingBrackets = getDaycareTimingBrackets();
  const costBrackets = getDaycareCostBrackets();

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-300">איך המעון עובד</h2>
      <ul className="mb-4 list-inside list-disc space-y-1 text-xs text-slate-400">
        <li>ניתן להחזיק עד {DAYCARE_MAX_SLOTS} פוקימונים במעון בו-זמנית, כל אחד מתקדם בנפרד.</li>
        <li>הפקדת פוקימון עולה {DAYCARE_DEPOSIT_FEE.toLocaleString("he-IL")} כסף באופן מיידי — דמי כניסה שאינם מוחזרים.</li>
        <li>ההתקדמות ממשיכה גם כשאתם לא מחוברים למשחק — הזמן נספר לפי שעון אמיתי.</li>
        <li>ניתן להרוויח עד {DAYCARE_MAX_LEVELS_PER_STAY} רמות בכל שהייה במעון.</li>
        <li>רמה מקסימלית לכל פוקימון: {DAYCARE_MAX_POKEMON_LEVEL}.</li>
        <li>ככל שהפוקימון ברמה גבוהה יותר, כל רמה לוקחת יותר זמן.</li>
        <li>כל רמה שמורווחת מוסיפה חוב בכסף, בנוסף לדמי הכניסה.</li>
        <li>יש לשלם את מלוא חוב הרמות כדי להוציא כל פוקימון מהמעון.</li>
        <li>ללא תשלום — הפוקימון פשוט נשאר במעון, ללא כל נזק.</li>
      </ul>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">זמן לכל רמה</h3>
          <table className="w-full text-xs text-slate-300">
            <thead>
              <tr className="text-slate-500">
                <th className="text-right font-medium">רמות</th>
                <th className="text-right font-medium">זמן לרמה</th>
              </tr>
            </thead>
            <tbody>
              {timingBrackets.map((bracket, index) => (
                <tr key={bracket.maxLevel} className="border-t border-white/5">
                  <td className="py-1">{formatLevelRange(index === 0 ? 0 : timingBrackets[index - 1].maxLevel, bracket.maxLevel)}</td>
                  <td className="py-1">{bracket.hours} שעות</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">מחיר לכל רמה</h3>
          <table className="w-full text-xs text-slate-300">
            <thead>
              <tr className="text-slate-500">
                <th className="text-right font-medium">רמות</th>
                <th className="text-right font-medium">מחיר לרמה</th>
              </tr>
            </thead>
            <tbody>
              {costBrackets.map((bracket, index) => (
                <tr key={bracket.maxLevel} className="border-t border-white/5">
                  <td className="py-1">{formatLevelRange(index === 0 ? 0 : costBrackets[index - 1].maxLevel, bracket.maxLevel)}</td>
                  <td className="py-1">{bracket.cost.toLocaleString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
