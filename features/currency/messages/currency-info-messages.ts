import type { CurrencyType } from "@/features/currency/types/currency.types";

// CURRENCY INFO DIALOG (CurrencyInfoDialog.tsx) — approved copy, verbatim.
// Deliberately never mentions exact reward amounts/drop chances/formulas —
// a plain "how do I get more of this" explainer, not a rewards reference.
// The real amounts already live where they're granted
// (features/player-progression/progression-config.ts's LEVEL_UP_REWARD_TIERS,
// features/currency/services/currency-reward.service.ts's own tunable
// ranges, etc.) and are never duplicated or restated here.
export const CURRENCY_INFO_TITLES: Record<CurrencyType, string> = {
  money: "כסף",
  gold: "זהב",
};

// One entry per paragraph, in display order — an internal "\n" (money's
// second paragraph only) is a real line break within that paragraph, not a
// new one; the dialog renders it via `whitespace-pre-line`.
export const CURRENCY_INFO_PARAGRAPHS: Record<CurrencyType, string[]> = {
  money: [
    "כסף משמש לקניות, מעבר בין מחוזות ושירותים שונים במשחק.",
    "אפשר להשיג כסף בעיקר מקרבות שדה.\nבנוסף ניתן להשיג כסף מתיבות, מקרבות מכונים, מליגות ומעליית רמת המשתמש.",
  ],
  gold: [
    "זהב הוא מטבע יקר יותר שמשמש לרכישות מיוחדות במשחק.",
    "אפשר להשיג זהב מקרבות שדה, מתיבות, ממכונים, מליגות ומעליית רמת המשתמש.",
  ],
};
